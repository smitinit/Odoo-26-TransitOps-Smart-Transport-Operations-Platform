from fastapi import APIRouter
from app.shared.responses import SuccessResponse

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("", response_model=SuccessResponse[dict])
async def health_check():
    """Basic health check"""
    return SuccessResponse(message="API is healthy", data={"status": "ok"})

@router.get("/live", response_model=SuccessResponse[dict])
async def liveness_check():
    """Liveness probe for Kubernetes/Docker"""
    return SuccessResponse(message="API is live", data={"status": "ok"})

@router.get("/ready", response_model=SuccessResponse[dict])
async def readiness_check():
    """Readiness probe checking database connectivity (can be expanded)"""
    # Here you would typically attempt a simple DB query like SELECT 1
    # For now, it returns ok.
    return SuccessResponse(message="API is ready", data={"status": "ok", "db": "ok"})
