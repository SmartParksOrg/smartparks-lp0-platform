# docs/CODEX_TASKS.md — Copy/Paste prompts for Codex (smartparks-lp0-platform)

This file contains Codex prompts aligned with `CODEX_BUILD_PLAN.md`. Keep commits small.

## Global Guardrails (paste at start of every Codex session)
> You are building a new greenfield repo `smartparks-lp0-platform`. Implement only the requested task. Keep commits small and reviewable. Enforce server-side RBAC. Implement upload hardening (.jsonl only, max size, safe paths). Implement decoder management (.js only; built-in vs uploaded; delete uploaded only). Implement scan tokens / scan contexts (TTL ~30 min). Implement decrypt+decode exports (CSV/JSON). Implement replay result table outputs. Do not copy any third-party branding assets; use neutral placeholders and Smart Parks-only tokens.

## Task 0 — Bootstrap with source repos (recommended)
> Follow `docs/CODEX_BOOTSTRAP_WITH_SOURCES.md` step-by-step and commit the results, including `docs/COPIED_SOURCES.md`.

## Task 1 — Backend skeleton (FastAPI)
> Create `backend/app/main.py` with a FastAPI app factory and add GET `/api/v1/health` returning `{ "status": "ok" }`. Add env-driven config in `backend/app/core/config.py` and CORS (allow localhost dev in local mode). Add `backend/requirements.txt` and update `backend/README.md` with run instructions.

## Task 2 — Frontend skeleton (React/Vite/TS)
> Scaffold `frontend/` using Vite + React + TypeScript. Add a simple page that calls `/api/v1/health` and displays the result. Configure a dev proxy or env base URL.

## Task 3 — Implement scan service + tests
> Implement JSONL parsing + scan service that returns record count, discovered gateway EUI(s), discovered DevAddr(s). Add tests using at least one `testdata/*.jsonl` file.

## Task 4 — Add DB scaffolding + models
> Add SQLAlchemy + Alembic with default SQLite DB at `/data/app.db`. Create models: User, DeviceCredential, LogFile, UserDecoder, ReplayJob, AuditEvent.

## Task 5 — Auth + RBAC
> Implement JWT login (`/api/v1/auth/login`), `/api/v1/auth/me`, password hashing, RBAC dependencies, and bootstrap admin user from env vars.

## Task 6 — Files + scan tokens
> Implement `/api/v1/files` endpoints (upload/list/preview/download/delete) and `/api/v1/files/{id}/scan` returning scan token + summary. Implement `/api/v1/scan/{token}` to read scan context (TTL ~30 min).

Continue with `CODEX_BUILD_PLAN.md` for the remaining parity features.
