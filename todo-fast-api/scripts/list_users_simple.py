import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from sqlalchemy import text


def list_users_simple():
    db = SessionLocal()
    try:
        # Direct SQL query to avoid model issues
        result = db.execute(
            text('SELECT id, email, name, role, mfa_enabled FROM "User"')
        )
        users = result.fetchall()

        if not users:
            print("No users found in database.")
            return

        print("\n" + "=" * 60)
        print("ALL USERS IN DATABASE")
        print("=" * 60)

        for user in users:
            print(f"\nID:          {user[0]}")
            print(f"Email:       {user[1]}")
            print(f"Name:        {user[2]}")
            print(f"Role:        {user[3]}")
            print(f"MFA Enabled: {user[4]}")
            print("-" * 60)

        print(f"\nTotal Users: {len(users)}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    list_users_simple()
