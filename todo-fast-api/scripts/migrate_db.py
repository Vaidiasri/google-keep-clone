import sys
import os

# Add parent directory to path so we can import 'database'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, Base
from sqlalchemy import text


def migrate():
    print("Starting migration...")
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")

        # 1. Add 'role' column
        try:
            conn.execute(
                text("ALTER TABLE \"User\" ADD COLUMN role VARCHAR DEFAULT 'USER'")
            )
            print("Added 'role' column.")
        except Exception as e:
            print(f"Skipped 'role' (might exist): {e}")

        # 2. Add 'mfa_enabled' column
        try:
            conn.execute(
                text('ALTER TABLE "User" ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE')
            )
            print("Added 'mfa_enabled' column.")
        except Exception as e:
            print(f"Skipped 'mfa_enabled' (might exist): {e}")

        # 3. Add 'mfa_secret' column
        try:
            conn.execute(text('ALTER TABLE "User" ADD COLUMN mfa_secret VARCHAR'))
            print("Added 'mfa_secret' column.")
        except Exception as e:
            print(f"Skipped 'mfa_secret' (might exist): {e}")

        # 4. Add 'version' column to Todo table
        try:
            conn.execute(
                text('ALTER TABLE "Todo" ADD COLUMN version INTEGER DEFAULT 1')
            )
            print("Added 'version' column to Todo.")
        except Exception as e:
            print(f"Skipped 'version' (might exist): {e}")

    # 4. Create new tables (like LoginHistory)
    # This works for completely new tables
    Base.metadata.create_all(bind=engine)
    print("Migration finished.")


if __name__ == "__main__":
    migrate()
