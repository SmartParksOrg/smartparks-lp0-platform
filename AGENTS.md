# Agent Instructions — smartparks-lp0-platform

This repository is being built with ChatGPT Codex. Follow these rules strictly.

## Operating mode
- Implement tasks from `docs/CODEX_TASKS.md` and `CODEX_BUILD_PLAN.md` in order.
- Keep commits small and reviewable (one logical change per commit).
- Prefer explicit, deterministic behavior over cleverness.
- Do not introduce new frameworks unless explicitly requested.

## Source reuse rules (critical)
- You may clone:
  - https://github.com/SmartParksOrg/smartparks-lp0-replay-app
  - https://github.com/PetervanLunteren/AddaxAI-Connect
- Clone sources only into `._tmp_sources/` (which must remain untracked and deleted after copying).
- Copy ONLY allowlisted paths as defined in `docs/CODEX_BOOTSTRAP_WITH_SOURCES.md`.
- Do NOT copy branding assets from AddaxAI-Connect (logos, images, favicons, product names).
- Do NOT copy secrets or real keys. Redact sample logs if needed.
- Always write `docs/COPIED_SOURCES.md` with commit SHAs and a file-by-file copy map.
- Delete `._tmp_sources/` after copying.

## Security and hygiene
- Treat user-uploaded JS decoders as untrusted.
- Enforce upload restrictions: `.jsonl` only for logs, `.js` only for decoders, max size limits.
- Enforce server-side RBAC for all relevant endpoints.
- Never commit `compose/.env` or any secrets.

## Definition of Done
- V1 parity is tracked in `docs/acceptance.md`. Do not drop features.
