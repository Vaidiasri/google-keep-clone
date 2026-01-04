import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import modal.user as models
from utils import get_password_hash


def reset_password(email, new_password):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"User {email} not found.")
            return

        # Update password
        user.password = get_password_hash(new_password)
        db.commit()
        print(f"Password for {email} has been reset successfully.")
        print(f"New credentials:")
        print(f"  Email: {email}")
        print(f"  Password: {new_password}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python reset_admin_password.py <email> <new_password>")
    else:
        reset_password(sys.argv[1], sys.argv[2])
