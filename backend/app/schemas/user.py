from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: Literal["owner", "staff"] = "staff"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[Literal["owner", "staff"]] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Mật khẩu mới phải có ít nhất 8 ký tự")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
