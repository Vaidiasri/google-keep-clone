from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
import os
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "user@example.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "password"),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@todoapp.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


async def send_welcome_email(email: EmailStr, password: str):
    html = f"""
    <h3>Welcome to Todo App</h3>
    <p>Your account has been created by the administrator.</p>
    <p><b>Username:</b> {email}</p>
    <p><b>Temporary Password:</b> {password}</p>
    <p>Please login and change your password immediately.</p>
    """

    message = MessageSchema(
        subject="Welcome to Todo App - Your Credentials",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


async def send_otp_email(email: EmailStr, otp: str):
    html = f"""
    <h3>OTP Verification</h3>
    <p>Your OTP for login is: <b>{otp}</b></p>
    <p>This OTP is valid for 5 minutes.</p>
    """

    message = MessageSchema(
        subject="Todo App - OTP Verification",
        recipients=[email],
        body=html,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False
