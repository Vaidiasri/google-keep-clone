import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text
from utils import get_password_hash


def create_test_admin():
    db = SessionLocal()
    try:
        # Simple credentials for testing
        email = "admin@test.com"
        password = "admin123"

        # Check if user exists
        check = db.execute(
            text('SELECT id FROM "User" WHERE email = :email'), {"email": email}
        ).fetchone()

        if check:
            # Update existing
            hashed = get_password_hash(password)
            db.execute(
                text(
                    'UPDATE "User" SET password = :pwd, role = :role, mfa_enabled = :mfa WHERE email = :email'
                ),
                {"pwd": hashed, "email": email, "role": "ADMIN", "mfa": False},
            )
            db.commit()
            print("✅ Updated existing admin user!")
        else:
            # Create new
            hashed = get_password_hash(password)
            db.execute(
                text(
                    'INSERT INTO "User" (email, password, name, role, mfa_enabled) VALUES (:email, :pwd, :name, :role, :mfa)'
                ),
                {
                    "email": email,
                    "pwd": hashed,
                    "name": "Test Admin",
                    "role": "ADMIN",
                    "mfa": False,
                },
            )
            db.commit()
            print("✅ Created new admin user!")

        print("\n" + "=" * 50)
        print("TEST ADMIN CREDENTIALS (SIMPLE)")
        print("=" * 50)
        print(f"Email:    {email}")
        print(f"Password: {password}")
        print("=" * 50)
        print("\n⚠️  Use these simple credentials for testing!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_test_admin()
