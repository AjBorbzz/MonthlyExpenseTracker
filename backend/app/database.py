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
    if engine.dialect.name == "postgresql":
        _run_postgresql_migrations()
    elif engine.dialect.name == "sqlite":
        _run_sqlite_migrations()


def _run_postgresql_migrations():
    bigint_columns = {
        "quantity_units",
        "invested_amount_cents",
        "current_value_cents",
    }
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER"))
        connection.execute(text("ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS anchor_day INTEGER"))
        connection.execute(text("ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS anchor_month INTEGER"))
        connection.execute(text("ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS merchant VARCHAR(255)"))
        connection.execute(text("ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(80)"))
        connection.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_expense_id INTEGER"))
        connection.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurring_due_date DATE"))

        connection.execute(
            text(
                """
                UPDATE recurring_expenses AS recurring
                SET created_by_user_id = families.owner_user_id
                FROM families
                WHERE recurring.family_id = families.id
                  AND recurring.created_by_user_id IS NULL
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE recurring_expenses
                SET anchor_day = EXTRACT(DAY FROM next_due_date)::INTEGER,
                    anchor_month = EXTRACT(MONTH FROM next_due_date)::INTEGER
                WHERE anchor_day IS NULL OR anchor_month IS NULL
                """
            )
        )
        connection.execute(text("ALTER TABLE recurring_expenses ALTER COLUMN created_by_user_id SET NOT NULL"))
        connection.execute(text("ALTER TABLE recurring_expenses ALTER COLUMN anchor_day SET NOT NULL"))
        connection.execute(text("ALTER TABLE recurring_expenses ALTER COLUMN anchor_month SET NOT NULL"))

        connection.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'recurring_expenses_created_by_user_id_fkey'
                    ) THEN
                        ALTER TABLE recurring_expenses
                        ADD CONSTRAINT recurring_expenses_created_by_user_id_fkey
                        FOREIGN KEY (created_by_user_id) REFERENCES users(id);
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'expenses_recurring_expense_id_fkey'
                    ) THEN
                        ALTER TABLE expenses
                        ADD CONSTRAINT expenses_recurring_expense_id_fkey
                        FOREIGN KEY (recurring_expense_id) REFERENCES recurring_expenses(id);
                    END IF;
                END $$;
                """
            )
        )
        _create_recurring_indexes(connection)

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


def _run_sqlite_migrations():
    recurring_columns = {
        "created_by_user_id": "INTEGER",
        "anchor_day": "INTEGER",
        "anchor_month": "INTEGER",
        "merchant": "VARCHAR(255)",
        "payment_method": "VARCHAR(80)",
    }
    expense_columns = {
        "recurring_expense_id": "INTEGER",
        "recurring_due_date": "DATE",
    }
    with engine.begin() as connection:
        existing_recurring = _sqlite_column_names(connection, "recurring_expenses")
        for column_name, column_type in recurring_columns.items():
            if column_name not in existing_recurring:
                connection.execute(
                    text(f"ALTER TABLE recurring_expenses ADD COLUMN {column_name} {column_type}")
                )

        existing_expenses = _sqlite_column_names(connection, "expenses")
        for column_name, column_type in expense_columns.items():
            if column_name not in existing_expenses:
                connection.execute(text(f"ALTER TABLE expenses ADD COLUMN {column_name} {column_type}"))

        connection.execute(
            text(
                """
                UPDATE recurring_expenses
                SET created_by_user_id = (
                    SELECT owner_user_id FROM families
                    WHERE families.id = recurring_expenses.family_id
                )
                WHERE created_by_user_id IS NULL
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE recurring_expenses
                SET anchor_day = CAST(strftime('%d', next_due_date) AS INTEGER),
                    anchor_month = CAST(strftime('%m', next_due_date) AS INTEGER)
                WHERE anchor_day IS NULL OR anchor_month IS NULL
                """
            )
        )
        _create_recurring_indexes(connection)


def _sqlite_column_names(connection, table_name: str) -> set[str]:
    return {
        row[1]
        for row in connection.execute(text(f"PRAGMA table_info({table_name})"))
    }


def _create_recurring_indexes(connection):
    connection.execute(
        text(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_recurring_occurrence
            ON expenses (family_id, recurring_expense_id, recurring_due_date)
            """
        )
    )
    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_expenses_recurring_expense_id
            ON expenses (recurring_expense_id)
            """
        )
    )
    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_expenses_recurring_due_date
            ON expenses (recurring_due_date)
            """
        )
    )
    connection.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_recurring_expenses_created_by_user_id
            ON recurring_expenses (created_by_user_id)
            """
        )
    )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
