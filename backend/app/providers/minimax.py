import base64
from pathlib import Path
import uuid

import httpx

from app.config import Settings
from app.models import GenerateRequest
from app.providers.base import MusicProvider, ProviderResult


class InferenceServerError(RuntimeError):
    """Raised when the configured inference endpoint cannot return playable audio."""


class MiniMaxProvider(MusicProvider):
    """Thin adapter for a MiniMax Music-compatible HTTP inference server.

    The default contract is POST /generate. Compatible servers may return raw WAV
    bytes, a JSON URL in audioUrl/audio_url/url, or base64 audio in audioBase64.
    Adapt this file if your inference server uses a different wire format.
    """

    def __init__(self, settings: Settings):
        self.settings = settings

    async def generate(self, request: GenerateRequest, enhanced_prompt: str) -> ProviderResult:
        endpoint = f"{self.settings.minimax_endpoint}/{self.settings.minimax_generate_path.lstrip('/')}"
        payload = {
            "prompt": enhanced_prompt,
            "original_prompt": request.prompt,
            "bpm": request.bpm,
            "duration": request.duration,
            "genre": request.genre,
            "mood": request.mood,
            "vocal": request.vocal,
            "lyrics": request.lyrics,
        }
        try:
            async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
        except httpx.TimeoutException as exc:
            raise InferenceServerError("The inference server timed out") from exc
        except httpx.HTTPError as exc:
            raise InferenceServerError("Unable to reach the inference server") from exc

        content_type = response.headers.get("content-type", "").lower()
        if "audio/" in content_type or "application/octet-stream" in content_type:
            return ProviderResult(audio_url=self._save_audio(response.content), provider_id=response.headers.get("x-generation-id"))

        try:
            body = response.json()
        except ValueError as exc:
            raise InferenceServerError("Inference server returned an unsupported response") from exc

        audio_url = body.get("audioUrl") or body.get("audio_url") or body.get("url")
        if isinstance(audio_url, str) and audio_url:
            return ProviderResult(audio_url=audio_url, provider_id=body.get("id"))

        encoded_audio = body.get("audioBase64") or body.get("audio_base64")
        if isinstance(encoded_audio, str) and encoded_audio:
            try:
                return ProviderResult(audio_url=self._save_audio(base64.b64decode(encoded_audio)), provider_id=body.get("id"))
            except (ValueError, TypeError) as exc:
                raise InferenceServerError("Inference server returned invalid base64 audio") from exc

        raise InferenceServerError("Inference server response did not include audio")

    def _save_audio(self, audio_bytes: bytes) -> str:
        self.settings.output_dir.mkdir(parents=True, exist_ok=True)
        file_name = f"{uuid.uuid4()}.wav"
        output_path = Path(self.settings.output_dir) / file_name
        output_path.write_bytes(audio_bytes)
        return f"/outputs/{file_name}"

