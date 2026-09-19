import re
import uuid

from app.models import GenerateRequest, GenerateResponse, GenerationMetadata
from app.providers.base import MusicProvider


class MusicService:
    def __init__(self, provider: MusicProvider):
        self.provider = provider

    async def generate(self, request: GenerateRequest) -> GenerateResponse:
        enhanced_prompt = self.build_prompt(request)
        result = await self.provider.generate(request, enhanced_prompt)
        return GenerateResponse(
            id=result.provider_id or str(uuid.uuid4()),
            audioUrl=result.audio_url,
            title=self.build_title(request.prompt),
            metadata=GenerationMetadata(
                bpm=request.bpm,
                duration=request.duration,
                genre=request.genre,
                mood=request.mood,
            ),
        )

    @staticmethod
    def build_prompt(request: GenerateRequest) -> str:
        performance = "with vocals" if request.vocal else "instrumental"
        additions = (
            f"{request.mood.lower()} {request.genre.lower()} track, {performance}, "
            f"around {request.bpm} BPM, approximately {request.duration} seconds"
        )
        prompt = f"{request.prompt.strip()}. Style guidance: {additions}."
        if request.vocal and request.lyrics:
            prompt += f" Lyrics: {request.lyrics.strip()}"
        return prompt

    @staticmethod
    def build_title(prompt: str) -> str:
        words = re.findall(r"[\w'-]+", prompt, flags=re.UNICODE)[:5]
        return " ".join(word.capitalize() for word in words) or "Generated Track"

