# smartparks-lp0-platform

Greenfield rebuild of the LP0 Replay tool as a production-ready platform:

- Backend: FastAPI (Python)
- Frontend: React + Vite + TypeScript
- Local install: Docker Compose
- Server deploy: Nginx reverse proxy + Postgres + Auth/RBAC
- Feature parity target: `smartparks-lp0-replay-app` (V1)

## Getting started (Day 0)
1. Read `CODEX_BUILD_PLAN.md`
2. Follow `docs/CODEX_BOOTSTRAP_WITH_SOURCES.md` to import allowed reference assets (V1 decoders, generator reference, optional look references).
3. Use ChatGPT Codex (VS Code) to execute tasks phase-by-phase.
4. For local dev, run `./scripts/dev-up.sh`.

## Repository status
This repository is intentionally bootstrapped with documentation and placeholders only.
Application code will be created by Codex following the build plan.

## WHEREWASI?
Last updated: 2026-01-11

Completed:
- Backend: FastAPI skeleton + config + DB models + Alembic scaffolding.
- Auth/RBAC: JWT login/me, admin bootstrap, role guards.
- Files API: upload/list/preview/download/delete/scan with scan tokens + TTL.
- Generator: JSONL generation endpoint + Start page UI.
- Devices API + UI.
- Decoders API + UI (built-in + uploaded, view source, delete uploaded only).
- Decode API + UI with CSV/JSON export + decode test fixture.
- Replay API + UI (Semtech UDP PUSH_DATA).
- Frontend: routed layout with Start/Devices/Files/Decoders/Integrations/About.
- Files UI: upload/list/preview/scan/download/delete + scan token shortcut.

Next up:
- Add decode/replay shortcuts from Files to Start (deep links/anchors).
- Finish remaining parity items in `CODEX_BUILD_PLAN.md` (Integrations/About content, admin UX, caching strategies, etc.).

## Key docs
- `CODEX_BUILD_PLAN.md` — authoritative build plan (V1 feature parity)
- `docs/CODEX_BOOTSTRAP_WITH_SOURCES.md` — how Codex should clone/copy from V1 and AddaxAI-Connect (look-only)
- `docs/acceptance.md` — parity acceptance checklist (expand over time)
