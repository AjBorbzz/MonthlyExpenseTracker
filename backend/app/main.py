from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import auth, budgets, categories, dashboard, expenses, families, income, recurring, savings_goals, users

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Monthly Family Expense Tracker API", version="1.0.0")

origins = [
    "http://192.168.254.112:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(families.router)
app.include_router(categories.router)
app.include_router(expenses.router)
app.include_router(income.router)
app.include_router(budgets.router)
app.include_router(recurring.router)
app.include_router(savings_goals.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
