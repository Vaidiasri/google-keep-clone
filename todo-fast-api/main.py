from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Any
from database import create_db
import modal.todo as models
import modal.user as user_models
import schema.todo as schemas
import schema.user as user_schemas
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_db,
    # RoleChecker, # We will use PolicyChecker now
)
from policy_engine import Action, ResourceType
from policies import PolicyChecker
import uvicorn
import pyotp
import qrcode
import io
import base64
import random
import string
from utils_email import send_welcome_email
from utils_cache import cache
from datetime import datetime

app = FastAPI()


# Custom Exception Handler to match Node.js error format ({"error": "message"})
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


# CORS Middleware setup kar rahe hain taaki Frontend hamare API ko call kar sake
# "allow_origins=['*']" ka matlab hai kahin se bhi request aa sakti hai (Dev ke liye theek hai)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Start hote hi database tables create kar dega agar nahi hain
create_db()


@app.get("/", tags=["Health"])
def home():
    # Bas check karne ke liye ki server zinda hai ya nahi
    return {"message": "FastAPI Logic Backend is Running"}


# --- Auth Routes (Login/Signup) ---


# Helper to log context
def log_login_context(db: Session, user_id: int, request: Request, status: str):
    history = user_models.LoginHistory(
        user_id=user_id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
        status=status,
        timestamp=datetime.utcnow(),
    )
    db.add(history)
    db.commit()


@app.post("/register", response_model=user_schemas.Token, tags=["Auth"])
def register(user: user_schemas.UserCreate, db: Session = Depends(get_db)):
    # Pehle check karo user already exist karta hai kya email se
    db_user = (
        db.query(user_models.User).filter(user_models.User.email == user.email).first()
    )
    if db_user:
        raise HTTPException(status_code=400, detail="User already exists")

    # Password ko direct save nahi karte, hash karke rakhte hain security ke liye
    hashed_password = get_password_hash(user.password)
    new_user = user_models.User(
        email=user.email, password=hashed_password, name=user.name
    )
    db.add(new_user)
    db.commit()  # Database mein save kiya
    db.refresh(new_user)  # Wapas naye user ka data load kiya (id wagera)

    # Token generate karke bhej rahe hain taaki user direct login ho jaye
    access_token = create_access_token(data={"sub": new_user.email})
    return {"token": access_token, "token_type": "bearer", "user": new_user}


@app.post("/login", response_model=user_schemas.Token, tags=["Auth"])
async def login(
    request: Request, form_data: user_schemas.UserLogin, db: Session = Depends(get_db)
):
    # User ko email se dhundho
    user = (
        db.query(user_models.User)
        .filter(user_models.User.email == form_data.email)
        .first()
    )

    # Agar user nahi mila ya password galat hai to error
    if not user or not verify_password(form_data.password, user.password):
        # Security: Log failed attempt (Optional implementation)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Context Logging
    log_login_context(
        db, user.id, request, "MFA_PENDING" if user.mfa_enabled else "SUCCESS"
    )

    # MFA Logic
    temp_token = create_access_token(data={"sub": user.email, "type": "temp"})

    # Case 1: First Time User (Force Setup)
    if not user.mfa_enabled:
        return {
            "mfa_setup_required": True,
            "temp_token": temp_token,
            "token": None,
            "token_type": None,  # No access token yet
        }

    # Case 2: MFA Enabled User
    return {
        "mfa_required": True,
        "temp_token": temp_token,
        "token": None,
        "token_type": None,
    }


# MFA Setup Route
@app.post("/auth/mfa/setup", tags=["MFA"])
async def mfa_setup(
    db: Session = Depends(get_db),
    current_user: user_models.User = Depends(get_current_user),
):
    # Generate new Secret
    secret = pyotp.random_base32()

    # Save secret to DB (MFA still disabled)
    current_user.mfa_secret = secret
    db.commit()

    # Generate QR Code
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=current_user.email, issuer_name="TodoApp")

    img = qrcode.make(uri)
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()

    return {"secret": secret, "qr_code": f"data:image/png;base64,{img_str}"}


# MFA Verify & Enable Route
@app.post("/auth/mfa/verify", response_model=user_schemas.Token, tags=["MFA"])
async def mfa_verify(
    verify_data: user_schemas.MFAVerify,
    db: Session = Depends(get_db),
    current_user: user_models.User = Depends(get_current_user),
):
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=400, detail="MFA setup not initiated. Call /setup first."
        )

    totp = pyotp.TOTP(current_user.mfa_secret)

    # Allow 1 window backward/forward
    if not totp.verify(verify_data.otp, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Activate MFA
    current_user.mfa_enabled = True
    db.commit()

    # Return Real Access Token
    access_token = create_access_token(data={"sub": current_user.email})
    return {"token": access_token, "token_type": "bearer", "user": current_user}


@app.post("/auth/mfa/login", response_model=user_schemas.Token, tags=["MFA"])
async def mfa_login(
    body: user_schemas.MFAVerify,
    db: Session = Depends(get_db),
    current_user: user_models.User = Depends(get_current_user),
):
    if not current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA not enabled for user")

    if not current_user.mfa_secret:
        raise HTTPException(status_code=500, detail="MFA integrity error")

    totp = pyotp.TOTP(current_user.mfa_secret)

    # DEBUG: Print Expected OTP
    print(f"DEBUG: Checking OTP for {current_user.email}")
    print(f"DEBUG: Secret: {current_user.mfa_secret}")
    print(f"DEBUG: Input OTP: {body.otp}")
    print(
        f"DEBUG: Valid OTPs: {totp.now()}, Previous: {totp.at(datetime.now().timestamp() - 30)}"
    )

    if not totp.verify(body.otp, valid_window=2):  # Increased window to 2
        print("DEBUG: OTP Verification Failed")
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Success
    access_token = create_access_token(data={"sub": current_user.email})
    return {"token": access_token, "token_type": "bearer", "user": current_user}


# User ko email se dhundho (OAuth2 form username field mein email bhejta hai)
@app.post("/token", response_model=user_schemas.Token, tags=["Auth"])
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = (
        db.query(user_models.User)
        .filter(user_models.User.email == form_data.username)
        .first()
    )

    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Simplified token for Swagger (Bypassing MFA for easy testing if needed, or enforce same logic)
    access_token = create_access_token(data={"sub": user.email})
    return {"token": access_token, "token_type": "bearer", "user": user}


# --- Admin Routes ---


@app.post("/admin/users", tags=["Admin"])
async def create_user_by_admin(
    user_data: user_schemas.UserCreate,
    db: Session = Depends(get_db),
    _: user_models.User = Depends(PolicyChecker(Action.UPDATE, ResourceType.USER)),
):
    # Check if user already exists
    if (
        db.query(user_models.User)
        .filter(user_models.User.email == user_data.email)
        .first()
    ):
        raise HTTPException(
            status_code=400, detail="User with this email already exists"
        )

    # Generare Random Password
    raw_password = "".join(random.choices(string.ascii_letters + string.digits, k=10))
    hashed = get_password_hash(raw_password)

    new_user = user_models.User(
        email=user_data.email,
        password=hashed,
        name=user_data.name,
        role=user_data.role,  # "USER" or "ADMIN"
    )
    db.add(new_user)
    db.commit()

    # Send Email
    email_success = await send_welcome_email(user_data.email, raw_password)

    if email_success:
        return {
            "message": "User created successfully. Email sent.",
            "userId": new_user.id,
        }
    else:
        # Fallback for when email fails (e.g. invalid credentials)
        return {
            "message": "User created, but email failed. Here is the temp password:",
            "userId": new_user.id,
            "temp_password": raw_password,
        }


@app.get("/admin/users", response_model=List[user_schemas.UserRead], tags=["Admin"])
def get_users_by_admin(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: user_models.User = Depends(PolicyChecker(Action.READ, ResourceType.USER)),
):
    users = db.query(user_models.User).offset(skip).limit(limit).all()
    return users


@app.delete("/admin/users/{user_id}", tags=["Admin"])
def delete_user_by_admin(
    user_id: int,
    db: Session = Depends(get_db),
    _: user_models.User = Depends(PolicyChecker(Action.DELETE, ResourceType.USER)),
):
    user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete todos associated with user (Cascade is usually handled by DB, but safe to check)
    db.query(models.Todo).filter(models.Todo.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


@app.patch(
    "/admin/users/{user_id}", response_model=user_schemas.UserRead, tags=["Admin"]
)
def update_user_by_admin(
    user_id: int,
    user_update: user_schemas.UserUpdate,
    db: Session = Depends(get_db),
    _: user_models.User = Depends(PolicyChecker(Action.UPDATE, ResourceType.USER)),
):
    db_user = db.query(user_models.User).filter(user_models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.role:
        db_user.role = user_update.role
    if user_update.name:
        db_user.name = user_update.name

    db.commit()
    db.refresh(db_user)
    return db_user


# --- Todo Routes (Protected) ---
# Yahan "current_user" dependency use kar rahe hain, matlab bina login kiye ye nahi chalega


@app.get("/todos", response_model=List[schemas.TodoRead], tags=["Todos"])
def read_todos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: user_models.User = Depends(get_current_user),
    _: Any = Depends(PolicyChecker(Action.READ, ResourceType.TODO)),
):
    # Cache Key
    cache_key = f"todos:{current_user.id}:{skip}:{limit}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # Query base: Sirf top-level todos la rahe hain (jinka koi parent nahi hai)
    # joinedload use kar rahe hain taaki owner details bhi saath mein mil jayein
    query = (
        db.query(models.Todo)
        .options(joinedload(models.Todo.owner))
        .filter(models.Todo.parent_id.is_(None))
    )

    # Agar user ADMIN nahi hai, toh sirf uske apne todos dikhao
    if current_user.role != "ADMIN":
        query = query.filter(models.Todo.user_id == current_user.id)

    todos = query.offset(skip).limit(limit).all()

    # Set Cache
    cache.set(cache_key, todos, ttl_seconds=60)

    return todos


@app.post("/todos", response_model=schemas.TodoRead, tags=["Todos"])
def create_todo(
    todo: schemas.TodoCreate,
    db: Session = Depends(get_db),
    current_user: user_models.User = Depends(get_current_user),
    _: Any = Depends(PolicyChecker(Action.CREATE, ResourceType.TODO)),
):
    # Naya todo bana rahe hain, user_id automatically current user ki daal rahe hain
    db_todo = models.Todo(**todo.dict(), user_id=current_user.id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)

    # Invalidate Cache
    cache.clear_all()  # Simple approach: clear all or specific user cache
    # cache.delete_pattern(f"todos:{current_user.id}:*") # If implemented

    return db_todo


@app.put("/todos/{todo_id}", response_model=schemas.TodoRead, tags=["Todos"])
def update_todo(
    todo_id: int,
    todo: schemas.TodoUpdate,
    db: Session = Depends(get_db),
    target_todo: models.Todo = Depends(PolicyChecker(Action.UPDATE, ResourceType.TODO)),
):
    # PolicyChecker already fetched and verified ownership of 'target_todo'
    db_todo = target_todo

    # Jo fields change hui hain unhe update kar do
    for key, value in todo.dict(exclude_unset=True).items():
        setattr(db_todo, key, value)

    # Increment Version (Etag)
    db_todo.version += 1

    db.commit()
    db.refresh(db_todo)

    cache.clear_all()  # Invalidate Cache

    return db_todo


@app.delete("/todos/{todo_id}", tags=["Todos"])
def delete_todo(
    todo_id: int,
    db: Session = Depends(get_db),
    target_todo: models.Todo = Depends(PolicyChecker(Action.DELETE, ResourceType.TODO)),
):
    db.delete(target_todo)
    db.commit()

    cache.clear_all()  # Invalidate Cache

    return {"ok": True}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
