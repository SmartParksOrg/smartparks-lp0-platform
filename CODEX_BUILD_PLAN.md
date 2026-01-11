# CODEX_BUILD_PLAN.md — smartparks-lp0-platform (Updated for Full V1 Feature Parity)

This document is written for **ChatGPT Codex** to build a new repository from scratch:
**smartparks-lp0-platform**.

It reflects the **full functional surface area** of the current `smartparks-lp0-replay-app` and is designed to ensure **no functionality is missed** during the rebuild.

---
## 0) Primary Objective

Build a production-ready, containerized web platform that delivers **feature parity with V1**, including:

1) **Files (stored logs)**: upload, index, preview (truncated), download, scan, decrypt+decode, replay, delete  
2) **Scan**: discover **Gateway EUI(s)** and **DevAddr(s)** and produce a reusable **scan token** / scan context  
3) **Devices**: manage per-DevAddr ABP session keys (NwkSKey/AppSKey) and optional friendly names  
4) **Decoders**: manage built-in and uploaded `.js` decoders; view source; delete uploaded only  
5) **Decrypt & Decode**: decrypt uplinks using keys, run JS decoder (supports `Decoder(bytes, port)` and `decodeUplink({bytes,fPort})`), show results table + packet details modal, export CSV and JSON  
6) **Replay**: send Semtech UDP forwarder `PUSH_DATA` packets to configurable host/port; show replay results table  
7) **Generate Test Logfile** (UI-driven): create realistic JSONL logs with EU868 defaults, datarate/coding rate options, time/interval/frames, presets for example payloads, downloadable and storable  
8) **Caching**: scan/decode caches (TTL ~30 min) or equivalent performance strategy  
9) **Integrations** page placeholder (MVP: keep as informational/placeholder; route exists)

Additionally:
- Build **local install via Docker Compose** for Windows/macOS/Linux
- Build **server mode** behind **Nginx**, with **auth + RBAC** and an **admin** role
- Reuse the **visual “look”** (spacing/radius/shadows/typography density) from AddaxAI-Connect style, but **no branding assets** are copied

---
## 1) Architecture Summary (V2)

### Backend
- **FastAPI** (Python)
- Service layer for: scan, decrypt/decode, UDP replay, log generation
- Database: **SQLite** local; **Postgres** server
- Storage: `/data` volume for uploads, generated logs, user decoders, DB (local)

### Frontend
- **React + Vite + TypeScript**
- Token-based theme replicating “look”
- Pages correspond to V1 navigation:
  - Start, Devices, Files, Decoders, Integrations, About
  - Decrypt & Decode workflow
  - Replay workflow
  - Generate Test Logfile workflow

### Deployment
- `compose/docker-compose.local.yml` (one-command local)
- `compose/docker-compose.server.yml` (nginx + backend + postgres)
- `nginx/server.conf` for SPA + `/api` proxy

---
## 2) Data Storage Parity (must match V1 behavior)
Persist under `DATA_DIR` (default `/data`):

- `/data/uploads/` — uploaded and generated `.jsonl` files
- `/data/decoders/` — user-uploaded decoder `.js` files
- `/data/app.db` — SQLite in local mode

V1 used JSON indices (`uploads.json`, `credentials.json`).  
V2 will use the database as source of truth, but must preserve equivalent capabilities.

---
## 3) Domain Model (Updated for V1 parity)

### 3.1 User + RBAC
- `User`: email, password_hash, role (`admin|editor|viewer`), is_active, timestamps

### 3.2 Device Credentials (V1 credentials.json parity)
- `DeviceCredential`:
  - id (uuid)
  - owner_user_id (nullable if shared/global; decide policy)
  - devaddr (hex string, unique per scope)
  - device_name (optional)
  - nwkskey (hex)
  - appskey (hex)
  - created_at, updated_at

**Policy:** for server mode, support per-user or per-workspace scoping later.
For MVP, allow:
- non-admin users manage their own credentials
- admin can manage all (or provide “global” credentials) — decide and enforce.

### 3.3 Stored Files (V1 uploads.json parity)
- `LogFile`:
  - id, owner_user_id
  - original_filename
  - storage_path
  - size_bytes
  - uploaded_at
  - source_type (`uploaded|generated`)
  - metadata_json (optional: discovered gateways/devaddrs, time range)

### 3.4 Scan Context (V1 scan token parity)
V1 uses in-memory caches (30 min TTL) keyed by token.  
V2 must implement an equivalent “scan token” concept:

- `ScanContext` (DB or cache):
  - token (random)
  - log_file_id
  - discovered_gateway_euis[]
  - discovered_devaddrs[]
  - created_at
  - expires_at (TTL ~30 min)

Implementation choices:
- MVP: in-memory cache (per backend instance) with TTL
- Better: store in DB so server mode is resilient across restarts

**Required behavior:** Start → Scan yields token; token drives Decrypt/Decode and Replay flows.

### 3.5 Decoders (built-in + user uploaded)
- Built-in decoders: shipped in repo `decoders/` and enumerated at runtime
- User decoders: stored in `/data/decoders/` and registered in DB table `UserDecoder`:
  - id, owner_user_id
  - filename_original, storage_path
  - uploaded_at

### 3.6 Decrypt+Decode Results (V1 DECODE_CACHE parity)
Optional:
- Cache decoded results per (scan token, decoder id, device set) for ~30 min.

### 3.7 Replay Jobs
- `ReplayJob`: log_file_id, udp_host/port, status, stats_json, timestamps

### 3.8 Audit Events
- `AuditEvent`: user_id, action, payload_json, created_at

---
## 4) API Surface (Updated to cover all V1 features)

All endpoints are versioned: `/api/v1`.

### 4.1 Auth
- POST `/auth/login`
- GET `/auth/me`
- (Optional) POST `/auth/logout` (JWT no-op acceptable)

### 4.2 Files (stored logs) — V1 “Files” parity
- POST `/files/upload` (multipart `.jsonl`) → creates LogFile
- POST `/files/generate` (generator params) → creates LogFile + stores JSONL
- GET `/files` list
- GET `/files/{id}` metadata
- GET `/files/{id}/preview` (truncated preview, ~200 KB or N lines)
- GET `/files/{id}/download`
- DELETE `/files/{id}` delete file + record (RBAC)
- POST `/files/{id}/scan` → returns scan token + scan summary (gateway EUIs, devaddrs, counts)

### 4.3 Scan Context
- GET `/scan/{token}` → scan summary
- (Optional) DELETE `/scan/{token}` → invalidate context

### 4.4 Devices / Credentials — V1 “Device Session Keys” parity
- GET `/devices` list credentials
- POST `/devices` create credential
- PATCH `/devices/{id}` update keys/name
- DELETE `/devices/{id}` optional
- Bulk update endpoint optional: POST `/devices/bulk` (for V1 “bulk edit” UX)

### 4.5 Decoders — V1 “Decoders” parity
- GET `/decoders` list decoders (built-in + uploaded + “raw”)
- POST `/decoders/upload` (multipart `.js`)
- GET `/decoders/{id}` metadata
- GET `/decoders/{id}/source` view JS source
- DELETE `/decoders/{id}` (only for uploaded decoders)

Decoder compatibility requirements:
- Support `Decoder(bytes, port)` and/or `decodeUplink({bytes,fPort})`

### 4.6 Decrypt & Decode — V1 parity
- POST `/decode`:
  - input: scan token OR file id, selected decoder id, selected devaddrs (optional)
  - output: table rows with:
    - status
    - devaddr
    - fcnt
    - fport
    - time
    - payload_hex
    - decoded_json
    - error details (if any)
- GET `/decode/{token}/export/csv` (or POST-based export)
- GET `/decode/{token}/export/json`

### 4.7 Replay — V1 parity
- POST `/replay` (editor/admin only):
  - input: scan token OR file id, udp_host, udp_port
  - output: replay log rows with:
    - status
    - gateway_eui
    - frequency
    - size
    - message
- GET `/replay/{id}` job status and results

### 4.8 About + Integrations
- GET `/about` (frontend route)
- GET `/integrations` (frontend route; MVP placeholder)

### 4.9 Admin
- `/admin/users` CRUD (admin only)
- `/admin/audit` list/filter (admin only)

---
## 5) Frontend Routes and UX (Must match V1 user journeys)
See `docs/acceptance.md` for the parity checklist and expand it into Given/When/Then over time.
