import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import models first
import modal.todo
import modal.user as models

from database import SessionLocal
from utils import get_password_hash


def create_or_update_admin():
    db = SessionLocal()
    try:
        email = "superadmin@todo.com"
        password = "SuperAdmin@2026"

        # Check if user exists
        user = db.query(models.User).filter(models.User.email == email).first()

        if user:
            # Update existing user
            user.password = get_password_hash(password)
            user.role = "ADMIN"
            user.name = "Super Administrator"
            db.commit()
            print(f"✅ Updated existing admin user!")
        else:
            # Create new admin
            admin = models.User(
                email=email,
                password=get_password_hash(password),
                name="Super Administrator",
                role="ADMIN",
                mfa_enabled=False,
            )
            db.add(admin)
            db.commit()
            print(f"✅ Created new admin user!")

        print("\n" + "=" * 50)
        print("🔐 SUPERADMIN CREDENTIALS")
        print("=" * 50)
        print(f"Email:    {email}")
        print(f"Password: {password}")
        print("=" * 50)
        print("\n⚠️  Save these credentials securely!")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    create_or_update_admin()
