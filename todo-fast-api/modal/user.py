from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"


# User Model - Ye 'User' table banayega database mein
class User(Base):
    __tablename__ = "User"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)  # Email unique hona chahiye
    password = Column(String)  # Hashed password store hoga
    name = Column(String, nullable=True)

    # RBAC & MFA Fields
    role = Column(String, default=UserRole.USER)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)

    # User ke saare todos ka relationship
    todos = relationship("Todo", back_populates="owner")
    login_history = relationship("LoginHistory", back_populates="user")


class LoginHistory(Base):
    __tablename__ = "LoginHistory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("User.id"))
    ip_address = Column(String)
    user_agent = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String)  # SUCCESS, FAILED, MFA_PENDING

    user = relationship("User", back_populates="login_history")
