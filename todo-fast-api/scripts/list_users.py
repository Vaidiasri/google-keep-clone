import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
import modal.user as models
import modal.todo as todo_models  # Import todo model to register relationships
from utils import get_password_hash


def list_all_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        if not users:
            print("No users found in database.")
            return

        print("\n=== All Users in Database ===")
        for user in users:
            print(f"\nID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Name: {user.name}")
            print(f"Role: {user.role}")
            print(f"MFA Enabled: {user.mfa_enabled}")
            print("-" * 40)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    list_all_users()
