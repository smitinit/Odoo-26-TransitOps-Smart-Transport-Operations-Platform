from pydantic import BaseModel, EmailStr

class LoginSchema(BaseModel):
    username: str  # OAuth2PasswordRequestForm uses 'username', we will use it for email
    password: str

class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    
class RefreshTokenSchema(BaseModel):
    refresh_token: str
