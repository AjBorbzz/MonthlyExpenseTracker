import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./expense_tracker.db")

connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def run_schema_migrations():
    if engine.dialect.name != "postgresql":
        return

    bigint_columns = {
        "quantity_units",
        "invested_amount_cents",
        "current_value_cents",
    }
    with engine.begin() as connection:
        column_types = connection.execute(
            text(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = 'investments'
                  AND column_name IN (
                    'quantity_units',
                    'invested_amount_cents',
                    'current_value_cents'
                  )
                """
            )
        ).mappings()
        for column in column_types:
            column_name = column["column_name"]
            if column_name in bigint_columns and column["data_type"] != "bigint":
                connection.execute(
                    text(
                        f"ALTER TABLE investments ALTER COLUMN {column_name} "
                        f"TYPE BIGINT USING {column_name}::BIGINT"
                    )
                )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
