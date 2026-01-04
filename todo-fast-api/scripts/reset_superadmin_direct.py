import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text
from utils import get_password_hash


def reset_superadmin():
    db = SessionLocal()
    try:
        email = "superadmin@todo.com"
        new_password = "SuperAdmin@2026"

        # Hash the password
        hashed = get_password_hash(new_password)

        # Update using raw SQL
        result = db.execute(
            text('UPDATE "User" SET password = :pwd WHERE email = :email'),
            {"pwd": hashed, "email": email},
        )
        db.commit()

        if result.rowcount > 0:
            print("✅ Password reset successful!")
            print("\n" + "=" * 50)
            print("SUPERADMIN CREDENTIALS")
            print("=" * 50)
            print(f"Email:    {email}")
            print(f"Password: {new_password}")
            print("=" * 50)
        else:
            print(f"❌ User {email} not found!")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    reset_superadmin()
