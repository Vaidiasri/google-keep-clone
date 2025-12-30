from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import SessionLocal
import modal.user as models
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration (Isse .env se hi lena behtar hai production mei!)
SECRET_KEY = os.getenv(
    "JWT_SECRET", "super-secret-key-for-dev"
)  # Ye secret kisi ko mat batana
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 5760  # 4 Days (4 * 24 * 60)

# Password hashing setup (bcrypt use kar rahe hain)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# OAuth2 scheme: Ye batata hai ki token kahan se milega ("token" route se for Swagger UI)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Password verify karne ke liye helper
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


# Password ko hash karne ke liye helper
def get_password_hash(password):
    return pwd_context.hash(password)


# JWT Token generate karne ka function
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# Database session create karne ke liye dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Ye sabse important dependency hai.
# Ye har protected route pe check karegi ki user logged in hai ya nahi.
# Agar logged in hai, to token se user dhund ke laayegi.
async def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Token decode karke email nikal rahe hain
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Email se user ko DB mein dhundo
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: models.User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted"
            )
        return user
