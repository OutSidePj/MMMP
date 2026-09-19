from dataclasses import dataclass
import os
from pathlib import Path


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_name: str
    minimax_endpoint: str
    minimax_generate_path: str
    mock_inference: bool
    mock_delay_seconds: float
    request_timeout_seconds: float
    cors_origins: tuple[str, ...]
    output_dir: Path
    sample_audio_path: Path


def get_settings() -> Settings:
    app_dir = Path(__file__).resolve().parent
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    return Settings(
        app_name=os.getenv("APP_NAME", "MiniMax Music Playground"),
        minimax_endpoint=os.getenv("MINIMAX_ENDPOINT", "http://localhost:8000").rstrip("/"),
        minimax_generate_path=os.getenv("MINIMAX_GENERATE_PATH", "/generate"),
        mock_inference=_as_bool(os.getenv("MOCK_INFERENCE"), default=True),
        mock_delay_seconds=max(0.0, float(os.getenv("MOCK_DELAY_SECONDS", "2.5"))),
        request_timeout_seconds=max(1.0, float(os.getenv("INFERENCE_TIMEOUT_SECONDS", "180"))),
        cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
        output_dir=app_dir / "outputs",
        sample_audio_path=app_dir / "assets" / "sample.wav",
    )

