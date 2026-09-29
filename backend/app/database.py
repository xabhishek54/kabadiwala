import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kabadiwala.db")

# Render provides postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

connect_args = {}
if IS_SQLITE:
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    # For PostgreSQL: connection pool settings that fit Render free tier
    pool_pre_ping=True,      # reconnect on stale connections
    pool_recycle=1800,       # recycle connections every 30min
    pool_size=2 if not IS_SQLITE else 1,
    max_overflow=3 if not IS_SQLITE else 0,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def run_migrations(target_engine):
    """Auto-migrate missing columns for SQLite prototyping databases only.
    PostgreSQL uses SQLAlchemy metadata create_all for schema management."""
    if not IS_SQLITE:
        return  # PostgreSQL: create_all handles schema on startup

    try:
        with target_engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(transactions)"))
            existing_cols = {row[1] for row in result.fetchall()}
            if not existing_cols:
                return

            new_columns = {
                "collection_lat": "FLOAT",
                "collection_lng": "FLOAT",
                "collection_address": "VARCHAR(500)",
                "pickup_scheduled_date": "VARCHAR(20)",
                "pickup_exact_time": "VARCHAR(10)",
                "pickup_window": "VARCHAR(20)",
                "pickup_notes": "VARCHAR(500)",
                "handover_lat": "FLOAT",
                "handover_lng": "FLOAT",
                "handover_address": "VARCHAR(500)",
            }
            for col_name, col_type in new_columns.items():
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE transactions ADD COLUMN {col_name} {col_type}"))
            conn.commit()
    except Exception as exc:
        print(f"Migration notice: {exc}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
