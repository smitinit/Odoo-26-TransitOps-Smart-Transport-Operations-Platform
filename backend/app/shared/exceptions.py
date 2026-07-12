from fastapi import Request, status
from fastapi.responses import JSONResponse
from .responses import ErrorResponse

class AppException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, errors: list = None):
        self.message = message
        self.status_code = status_code
        self.errors = errors or []

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    content = ErrorResponse(
        success=False,
        message=exc.message,
        errors=exc.errors
    ).model_dump()
    return JSONResponse(status_code=exc.status_code, content=content)

class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)

class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)
        
class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)
