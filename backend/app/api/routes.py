import logging

from fastapi import APIRouter, HTTPException, Request, status

from app.models import GenerateRequest, GenerateResponse, HealthResponse
from app.providers.minimax import InferenceServerError
from app.services.music_service import MusicService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@router.post("/generate", response_model=GenerateResponse)
async def generate(payload: GenerateRequest, request: Request) -> GenerateResponse:
    service: MusicService = request.app.state.music_service
    try:
        return await service.generate(payload)
    except InferenceServerError as exc:
        logger.warning("Inference request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"message": "Music generation failed.", "details": str(exc)},
        ) from exc
    except RuntimeError as exc:
        logger.exception("Music provider failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Music generation failed.", "details": str(exc)},
        ) from exc

