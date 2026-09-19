from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.models import GenerateRequest


@dataclass(frozen=True)
class ProviderResult:
    audio_url: str
    provider_id: str | None = None


class MusicProvider(ABC):
    @abstractmethod
    async def generate(self, request: GenerateRequest, enhanced_prompt: str) -> ProviderResult:
        """Generate music and return a URL that the browser can play."""

