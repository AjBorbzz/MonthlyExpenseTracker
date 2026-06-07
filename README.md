# Monthly Family Expense Tracker

A production-minded MVP for manual-first household budgeting. Families can share a workspace, log income and expenses, allocate category budgets, monitor savings, compare year-to-year spending, and track recurring obligations without paid APIs, LLMs, or bank sync.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, Pydantic, SQLite
- Auth: email/password signup and login, passlib bcrypt hashing, JWT access tokens
- Frontend: Next.js App Router, Tailwind CSS, shadcn-style UI primitives
- Charts: Recharts
- Money handling: integer cents in the database, peso decimals in API/UI

## Features

- Family workspaces with invite codes
- Shared household data scoped by authenticated family
- Expense categories with soft delete
- Expense, income, budget, recurring expense, and savings goal CRUD
- Dashboard summary with savings rate, projected month-end savings, budget health score, spending velocity, recurring due soon, and rule-based insights
- Monthly trend, category pie, year-to-year comparison, budget progress, and savings trend charts
- CSV export for selected month/year expenses
- CSV import for expenses using a standard template

## One-Command Server Scripts

Use these helper scripts when you want the app to start or stop with one command.

Always run these commands from the project root:

```bash
cd expense-tracker-family
```

### Start All Servers

Run:

```bash
./start all servers
```

This starts everything needed for the app:

- Backend FastAPI server on `http://127.0.0.1:8000`
- Frontend Next.js server on `http://127.0.0.1:3000`
- SQLite database setup and demo seed data
- Backend Python dependencies, if missing
- Frontend npm dependencies, if missing

When it finishes, open:

- App: `http://127.0.0.1:3000`
- API docs: `http://127.0.0.1:8000/docs`

### Stop All Servers

Run:

```bash
./stop all servers
```

This stops only server processes that belong to this `expense-tracker-family` app folder.

### Optional: Use Commands Without `./`

If you want to type exactly:

```bash
start all servers
stop all servers
```

enable the local shell functions first:

```bash
source scripts/expense-tracker-commands.sh
start all servers
```

After sourcing the command file, you can stop the app with:

```bash
stop all servers
```

You need to run `source scripts/expense-tracker-commands.sh` once per new terminal session, unless you add it to your shell profile.

### Direct Script Names

These are equivalent to the friendly commands:

```bash
./scripts/start-all-servers
./scripts/stop-all-servers
```

### Logs

Server logs are written here:

- `logs/backend.log`
- `logs/frontend.log`

### Safety

The scripts only stop processes that belong to this `expense-tracker-family` folder. Ownership is checked by the process command or working directory, so unrelated apps using ports `3000` or `8000` are left alone.

## Manual Run Option

Open two terminal windows or tabs from the project root.

Terminal 1 starts the backend API:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload
```

Terminal 2 starts the frontend app:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. API docs are at `http://localhost:8000/docs`.

After the first setup, you can usually start the app with only:

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

And in a second terminal:

```bash
cd frontend
npm run dev
```

## Manual Stop Option

If you started the app manually, press `Control + C` in each terminal running the app:

- Backend terminal running `uvicorn`
- Frontend terminal running `npm run dev`

```bash
Control + C
```

If a server was left running in the background and the port is still busy, find and stop it:

```bash
lsof -i :8000
kill <PID>
```

```bash
lsof -i :3000
kill <PID>
```

Use port `8000` for the backend and port `3000` for the frontend.

## Demo Account

- Email: `demo@example.com`
- Password: `password123`
- Demo invite code: `DEMO2026`

## Expense CSV Import

The Expenses page includes:

- `Template` button to download a standard CSV template
- `Import CSV` button to upload expenses in bulk
- Import summary showing imported, skipped, and error counts
- Row-level validation messages for invalid rows

The template is also stored in the repo:

```bash
docs/templates/expense-import-template.csv
```

Required CSV headers:

```csv
expense_date,description,category,amount,merchant,payment_method,notes,is_recurring
```

Rules:

- `expense_date` must use `YYYY-MM-DD`
- `description`, `category`, and `amount` are required
- `category` must match an active category in the signed-in family workspace
- `amount` must be greater than `0`
- `is_recurring` accepts `true/false`, `yes/no`, or `1/0`
- Duplicate rows are skipped by default when they match date, category, amount, description, and merchant
- Imports are scoped to the authenticated user's family

Example:

```csv
expense_date,description,category,amount,merchant,payment_method,notes,is_recurring
2026-06-01,Weekly grocery run,Groceries,2450.75,SM Supermarket,Card,Family groceries,false
```

## API Overview

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `GET|POST|PUT|DELETE /categories`
- `GET|POST|PUT|DELETE /expenses`
- `GET /expenses/export`
- `GET /expenses/import-template`
- `POST /expenses/import`
- `GET|POST|PUT|DELETE /income`
- `GET|POST|PUT|DELETE /budgets`
- `GET|POST|PUT|DELETE /recurring`
- `GET|POST|PUT|DELETE /savings-goals`
- `GET /dashboard/summary`

All non-auth routes require a bearer token and scope queries to the current user's family workspace.

## Database Design Summary

The SQLite schema includes users, families, family members, expense categories, expenses, income records, budget allocations, recurring expenses, and savings goals. Monetary values are stored as integer cents to avoid floating-point drift.

## Future Enhancements

- Bank statement upload
- OCR receipt scanning
- Mobile PWA
- Notification reminders
- Multi-currency support
- Family role permissions
- Local LLM-based financial insights when available
- Bank sync integration if legally and technically feasible
