# Frontend

Next.js App Router frontend for the Monthly Family Expense Tracker.

## Run

From the project root, the easiest option is:

```bash
./start all servers
```

Frontend-only manual run:

```bash
cd frontend
npm install
npm run dev
```

The app expects the API at `http://localhost:8000`. Override with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## Expense CSV Import

Open `/expenses`, then use:

- `Template` to download `expense-import-template.csv`
- `Import CSV` to upload a filled template

The frontend displays imported, skipped, and error counts after upload.

## Stop

From the project root:

```bash
./stop all servers
```

Frontend-only manual stop:

Press `Control + C` in the terminal running `npm run dev`.

If port `3000` is still busy:

```bash
lsof -i :3000
kill <PID>
```

Demo login:

- Email: `demo@example.com`
- Password: `password123`

## Pages

- `/login` and `/signup`
- `/dashboard`
- `/expenses`
- `/categories`
- `/income`
- `/investments`
- `/budgets`
- `/goals`
- `/recurring`
- `/settings`

## Investments

The `/investments` page provides family-scoped holding management, search and asset-type filters, portfolio value and return summaries, and an asset-allocation chart. Add or edit current values manually; no broker or market-data connection is required.

## Recurring Expenses

The `/recurring` page manages automatic expense schedules. Active due entries generate linked expenses when Dashboard, Expenses, or Recurring is opened. The page shows the last generated and next due dates, supports activation/deactivation, and includes a `Process due` command for an immediate catch-up run.
