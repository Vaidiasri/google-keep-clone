import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Environment variables load kar rahe hain .env file se
load_dotenv()

# Database URL le rahe hain, agar nahi mila to error aayega dhyan rakhna
DATABASE_URL = os.getenv("DATABASE_URL")

# Engine bana rahe hain jo actual connection maintain karega database ke sath
engine = create_engine(DATABASE_URL)

# SessionLocal class: Jab bhi humein DB se baat karni hogi, hum iska instance banayenge
# autocommit=False rakha hai taaki hum khud decide karein kab save karna hai
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class: Hamare saare models (tables) isko inherit karenge
Base = declarative_base()


# Ye helper function hai jo saari tables create karega agar wo exist nahi karti
def create_db():
    Base.metadata.create_all(bind=engine)
