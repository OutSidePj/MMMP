import logging
import shutil

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.config import get_settings
from app.providers import MiniMaxProvider, MockMusicProvider
from app.services import MusicService

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
settings = get_settings()
settings.output_dir.mkdir(parents=True, exist_ok=True)
if settings.sample_audio_path.exists():
    shutil.copyfile(settings.sample_audio_path, settings.output_dir / "sample.wav")

app = FastAPI(
    title=settings.app_name,
    description="Backend API for text-to-music generation through a configurable MiniMax endpoint.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

provider = MockMusicProvider(settings) if settings.mock_inference else MiniMaxProvider(settings)
app.state.music_service = MusicService(provider)
app.include_router(router)
app.mount("/outputs", StaticFiles(directory=settings.output_dir), name="outputs")
