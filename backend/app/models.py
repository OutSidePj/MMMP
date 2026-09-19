from typing import Literal

from pydantic import BaseModel, Field, field_validator


GENRES = {"Electronic", "Synthwave", "Hip-Hop", "Pop", "Rock", "Jazz", "Ambient", "Cinematic", "Lo-fi"}
MOODS = {"Energetic", "Happy", "Dark", "Calm", "Dreamy", "Epic", "Melancholic", "Aggressive"}


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    bpm: int = Field(ge=60, le=200)
    duration: int = Field(ge=10, le=60, multiple_of=5)
    genre: str
    mood: str
    vocal: bool = False
    lyrics: str | None = Field(default=None, max_length=1500)

    @field_validator("prompt")
    @classmethod
    def prompt_must_contain_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Prompt must contain text")
        return cleaned

    @field_validator("genre")
    @classmethod
    def genre_is_supported(cls, value: str) -> str:
        if value not in GENRES:
            raise ValueError("Unsupported genre")
        return value

    @field_validator("mood")
    @classmethod
    def mood_is_supported(cls, value: str) -> str:
        if value not in MOODS:
            raise ValueError("Unsupported mood")
        return value


class GenerationMetadata(BaseModel):
    bpm: int
    duration: int
    genre: str
    mood: str


class GenerateResponse(BaseModel):
    id: str
    status: Literal["completed"] = "completed"
    audioUrl: str
    title: str | None = None
    metadata: GenerationMetadata


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"

