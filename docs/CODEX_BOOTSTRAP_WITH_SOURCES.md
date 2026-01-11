# docs/CODEX_BOOTSTRAP_WITH_SOURCES.md — Bootstrap smartparks-lp0-platform using public source repos

## Context
We are building a new repo: **smartparks-lp0-platform** and want feature parity with V1.
You will run Codex from VS Code and have access to both public repos.

Source repos:
- V1: `https://github.com/SmartParksOrg/smartparks-lp0-replay-app`
- Addax: `https://github.com/PetervanLunteren/AddaxAI-Connect`

## Global Rules (must follow)
1) Do **not** copy any branding assets (logos, images, product names, favicons) from AddaxAI-Connect.
2) Do **not** copy secrets or real keys. If sample logs contain keys, redact them.
3) Keep provenance: create `docs/COPIED_SOURCES.md` with exact copied files + source commit hashes.
4) Only copy from allowlisted paths. If something else seems useful, stop and ask.
5) After copying, delete the temporary clones.

---
## Step 1 — Clone sources into a temporary folder

**Codex prompt**
> Create a temporary folder `._tmp_sources/` at repo root.
> Run:
> - `git clone https://github.com/SmartParksOrg/smartparks-lp0-replay-app ._tmp_sources/lp0_v1`
> - `git clone https://github.com/PetervanLunteren/AddaxAI-Connect ._tmp_sources/addax`
> Capture SHAs:
> - `cd ._tmp_sources/lp0_v1 && git rev-parse HEAD`
> - `cd ._tmp_sources/addax && git rev-parse HEAD`

---
## Step 2 — Copy allowlisted V1 assets

Allowlist from V1:
- `decoders/` → `./decoders/` (copy as-is)
- `make_test_log.py` → `./backend/reference/make_test_log.py` (reference-only)
- (Optional) `requirements.txt` → `./backend/reference/requirements-v1.txt`
- (Optional) sample `.jsonl` logs → `./testdata/` (redact keys)

**Codex prompt**
> Copy allowlisted V1 assets exactly as described above. Do not copy any other files.

---
## Step 3 — Copy Addax look-only references (optional)

Goal: copy only neutral styling references (tokens/config), no branding.

Destination:
- `./frontend/reference/addax-look/`

**Codex prompt**
> Identify Addax frontend styling (Tailwind/MUI/etc.). Copy only non-branding config + base styles to `frontend/reference/addax-look/`. Do not copy assets/logos/favicons or product naming strings.

---
## Step 4 — Write provenance

**Codex prompt**
> Create `docs/COPIED_SOURCES.md` with date, repo URLs, SHAs, and a file-by-file copy list (source -> destination), plus any redactions.

---
## Step 5 — Remove temporary clones

**Codex prompt**
> Delete `._tmp_sources/` and ensure `.gitignore` includes it.

---
## Step 6 — Start Phase 1 of `CODEX_BUILD_PLAN.md`
After staging assets, begin FastAPI + frontend scaffolding.
