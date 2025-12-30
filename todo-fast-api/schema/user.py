from pydantic import BaseModel, EmailStr
from enum import Enum
from typing import Optional


class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"


# User create karte waqt ye details chahiye
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None
    role: UserRole = UserRole.USER


# Login ke liye schema
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# User Update schema
class UserUpdate(BaseModel):
    role: Optional[UserRole] = None
    name: Optional[str] = None


# MFA Verification Schema
class MFAVerify(BaseModel):
    otp: str
    temp_token: str


# Minimal User info for resource ownership
class UserMinimal(BaseModel):
    id: int
    email: str
    name: str | None = None

    class Config:
        from_attributes = True


# Jab User ka data API return karegi, to ye fields dikhengi (password nahi dikhana chahiye)
class UserRead(BaseModel):
    id: int
    email: str
    name: str | None = None
    role: UserRole
    mfa_enabled: bool

    class Config:
        from_attributes = True


# Token response ka structure
class Token(BaseModel):
    token: str | None = None
    token_type: str | None = None
    # For MFA flows
    mfa_required: bool = False
    mfa_setup_required: bool = False
    temp_token: str | None = None
    user: UserRead | None = None  # Token ke saath user details bhi bhej rahe hain
