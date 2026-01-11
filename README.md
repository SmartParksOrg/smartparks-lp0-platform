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

## Repository status
This repository is intentionally bootstrapped with documentation and placeholders only.
Application code will be created by Codex following the build plan.

## Key docs
- `CODEX_BUILD_PLAN.md` — authoritative build plan (V1 feature parity)
- `docs/CODEX_BOOTSTRAP_WITH_SOURCES.md` — how Codex should clone/copy from V1 and AddaxAI-Connect (look-only)
- `docs/acceptance.md` — parity acceptance checklist (expand over time)
