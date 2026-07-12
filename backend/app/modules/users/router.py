from fastapi import APIRouter, Depends
from app.shared.responses import SuccessResponse
from app.modules.users.models import User
from app.modules.users.schemas import UserResponse
from app.api.dependencies.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/me", response_model=SuccessResponse[UserResponse])
async def read_current_user(
    current_user: User = Depends(get_current_user)
):
    """
    Get current logged in user.
    """
    return SuccessResponse(message="Current user retrieved successfully", data=current_user)
