from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402
from app.models import GenerateRequest  # noqa: E402
from app.providers.base import MusicProvider, ProviderResult  # noqa: E402
from app.providers.minimax import InferenceServerError  # noqa: E402
from app.services.music_service import MusicService  # noqa: E402


VALID_REQUEST = {
    "prompt": "energetic cyberpunk electronic music with futuristic synths",
    "bpm": 150,
    "duration": 20,
    "genre": "Electronic",
    "mood": "Energetic",
    "vocal": False,
    "lyrics": None,
}


class StubProvider(MusicProvider):
    async def generate(self, request: GenerateRequest, enhanced_prompt: str) -> ProviderResult:
        assert request.bpm == 150
        assert "150 BPM" in enhanced_prompt
        return ProviderResult(audio_url="/outputs/sample.wav", provider_id="stub-id")


class FailingProvider(MusicProvider):
    async def generate(self, request: GenerateRequest, enhanced_prompt: str) -> ProviderResult:
        raise InferenceServerError("Unable to reach the inference server")


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_generate_with_provider() -> None:
    original = app.state.music_service
    app.state.music_service = MusicService(StubProvider())
    try:
        with TestClient(app) as client:
            response = client.post("/api/generate", json=VALID_REQUEST)
    finally:
        app.state.music_service = original
    assert response.status_code == 200
    assert response.json()["id"] == "stub-id"
    assert response.json()["audioUrl"] == "/outputs/sample.wav"


def test_generate_validation() -> None:
    invalid = {**VALID_REQUEST, "bpm": 240, "duration": 12, "prompt": " "}
    with TestClient(app) as client:
        response = client.post("/api/generate", json=invalid)
    assert response.status_code == 422


def test_inference_error_is_safe() -> None:
    original = app.state.music_service
    app.state.music_service = MusicService(FailingProvider())
    try:
        with TestClient(app) as client:
            response = client.post("/api/generate", json=VALID_REQUEST)
    finally:
        app.state.music_service = original
    assert response.status_code == 503
    assert response.json()["detail"]["message"] == "Music generation failed."
    assert "stack" not in response.text.lower()

