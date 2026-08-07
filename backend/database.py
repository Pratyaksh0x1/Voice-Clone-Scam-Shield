import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Auto-load variables from a .env file if it exists
load_dotenv()

# Get the database URL from environment variables, or use a dummy placeholder
# The user will supply the real Postgres link here via .env or system environment
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://user:password@localhost/dbname")

# For PostgreSQL, we DO NOT need connect_args={"check_same_thread": False}
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
