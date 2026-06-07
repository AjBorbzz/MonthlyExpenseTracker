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

Money is stored as integer cents in SQLite and exposed as peso decimal values in API responses.
