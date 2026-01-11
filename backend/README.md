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
- `SMARTPARKS_DATA_DIR` (default: `/data`)
- `SMARTPARKS_UPLOAD_MAX_BYTES` (default: `26214400`)
- `SMARTPARKS_SCAN_CACHE_TTL_MINUTES` (default: `30`)
- `SMARTPARKS_SCAN_CACHE_MAX_ITEMS` (default: `200`)
- `SMARTPARKS_DECODE_CACHE_TTL_MINUTES` (default: `30`)
- `SMARTPARKS_DECODE_CACHE_MAX_ITEMS` (default: `100`)
- `SMARTPARKS_JWT_SECRET` (default: `dev-secret-change-me`)
- `SMARTPARKS_JWT_ALGORITHM` (default: `HS256`)
- `SMARTPARKS_ACCESS_TOKEN_EXPIRE_MINUTES` (default: `60`)
- `SMARTPARKS_ADMIN_EMAIL` (optional bootstrap admin email)
- `SMARTPARKS_ADMIN_PASSWORD` (optional bootstrap admin password)

## Migrations
- Initialize a migration: `alembic revision --autogenerate -m "init"`
- Apply migrations: `alembic upgrade head`
