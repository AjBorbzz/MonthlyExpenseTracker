# Backend

FastAPI API for the Monthly Family Expense Tracker.

## Run

From the project root, the easiest option is:

```bash
./start all servers
```

Backend-only manual run:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```

Swagger docs are available at `http://localhost:8000/docs`.

## Expense CSV Import

Download the standard template:

```http
GET /expenses/import-template
```

Import a CSV file:

```http
POST /expenses/import
```

Required headers:

```csv
expense_date,description,category,amount,merchant,payment_method,notes,is_recurring
```

The import is family-scoped, validates each row, skips duplicates by default, and returns imported/skipped/error counts.

## Investments API

Authenticated family members can manage shared investment holdings with:

```http
GET /investments
POST /investments
PUT /investments/{investment_id}
DELETE /investments/{investment_id}
```

`GET /investments` accepts optional `asset_type` and `search` query parameters. Amounts are stored as integer cents, quantities use eight-decimal scaled integer units, and API responses include calculated gain/loss and return percentage.

Investment quantities and monetary values use PostgreSQL `BIGINT` columns. On startup, the API safely widens older investment columns that were created as 32-bit integers, so existing deployments are upgraded automatically.

## Recurring Expense Processing

Active recurring schedules automatically generate linked expenses through an idempotent processor. It runs before recurring lists, expense lists and exports, and dashboard summaries and exports are returned.

```http
POST /recurring/process-due
```

The endpoint can also be called manually. Processing catches up missed weekly, monthly, and yearly occurrences, advances `next_due_date`, and uses a database uniqueness constraint to prevent duplicate schedule/date occurrences. Dates use `APP_TIMEZONE`, which defaults to `Asia/Manila`.

Existing SQLite and PostgreSQL databases are upgraded automatically at startup with schedule ownership, recurrence anchors, generated-expense linkage, and occurrence indexes.

## Stop

From the project root:

```bash
./stop all servers
```

Backend-only manual stop:

Press `Control + C` in the terminal running `uvicorn`.

If port `8000` is still busy:

```bash
lsof -i :8000
kill <PID>
```

Demo login:

- Email: `demo@example.com`
- Password: `password123`

Money is stored as integer cents in SQLite and exposed as peso decimal values in API responses. Investment values remain manual and do not require a market-data service.
