import sys
import os

# Add parent directory to path so we can import 'database' and 'modal'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import modal.user as models
import modal.todo  # Necessary to register Todo model for relationships
from utils import get_password_hash


def create_super_admin(email, passwordvar):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            print(f"User {email} already exists.")
            return

        hashed = get_password_hash(passwordvar)
        admin = models.User(
            email=email,
            password=hashed,
            name="Super Admin",
            role="ADMIN",
            mfa_enabled=False,  # Optional: Force him to setup MFA too
        )
        db.add(admin)
        db.commit()
        print(f"Super Admin {email} created successfully.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_super_admin.py <email> <password>")
    else:
        create_super_admin(sys.argv[1], sys.argv[2])
