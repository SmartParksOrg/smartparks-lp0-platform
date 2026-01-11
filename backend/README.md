# backend/

## Setup
- Create a virtual environment and install dependencies:
  - `python -m venv .venv`
  - `source .venv/bin/activate`
  - `pip install -r requirements.txt`

## Run (dev)
- `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

## Environment
- `SMARTPARKS_APP_ENV` (default: `local`)
- `SMARTPARKS_API_PREFIX` (default: `/api/v1`)
- `SMARTPARKS_CORS_ALLOW_ORIGINS` (comma-separated origins; empty uses local defaults)
- `SMARTPARKS_DATABASE_URL` (default: `sqlite:////data/app.db`)

## Migrations
- Initialize a migration: `alembic revision --autogenerate -m "init"`
- Apply migrations: `alembic upgrade head`
