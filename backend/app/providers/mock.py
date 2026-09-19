import asyncio

from app.config import Settings
from app.models import GenerateRequest
from app.providers.base import MusicProvider, ProviderResult


class MockMusicProvider(MusicProvider):
    def __init__(self, settings: Settings):
        self.settings = settings

    async def generate(self, request: GenerateRequest, enhanced_prompt: str) -> ProviderResult:
        del request, enhanced_prompt
        await asyncio.sleep(self.settings.mock_delay_seconds)
        if not self.settings.sample_audio_path.exists():
            raise RuntimeError("The bundled demo audio file is missing")
        return ProviderResult(audio_url="/outputs/sample.wav")

