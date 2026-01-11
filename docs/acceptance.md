# docs/acceptance.md — V1 Feature Parity Checklist (smartparks-lp0-platform)

Use this as the authoritative parity checklist during implementation.

## Navigation parity
- [ ] Navbar includes: Start, Devices, Files, Decoders, Integrations, About

## Files parity (stored logs)
- [ ] Upload `.jsonl` file (enforced extension, enforced max size)
- [ ] Stored logs list with actions: View, Download, Scan, Decode, Replay, Remove
- [ ] Preview stored log is truncated (~200KB or equivalent)

## Scan parity
- [ ] Scan discovers gateway EUI(s) and DevAddr(s)
- [ ] Scan returns a scan token context with TTL (~30 min)
- [ ] Scan token drives Decode and Replay flows

## Devices parity
- [ ] Store per DevAddr: optional name, NwkSKey, AppSKey
- [ ] Add/edit credentials (bulk edit optional but preferred)

## Decoders parity
- [ ] Built-in decoders enumerated from repo `decoders/`
- [ ] Upload user decoder `.js`, view source, delete uploaded only
- [ ] Decoder interfaces supported: `Decoder(bytes, port)` and `decodeUplink({bytes,fPort})`

## Decrypt & Decode parity
- [ ] Decode table includes: status, DevAddr, FCnt, FPort, time, payload hex, decoded JSON
- [ ] Packet details modal exists
- [ ] Export CSV and JSON
- [ ] Decode caching (~30 min) or equivalent performance strategy

## Replay parity
- [ ] Configure UDP host/port, send Semtech UDP PUSH_DATA from log records
- [ ] Replay output table includes: status, gateway eui, frequency, size, message
- [ ] RBAC: only editor/admin can start replay

## Generator parity
- [ ] UI-driven generator with EU868 defaults, datarate/coding rate, UTC time and interval, presets
- [ ] Generated JSONL downloadable and storable in Files list

## Deployment parity
- [ ] Local: docker compose local works
- [ ] Server: nginx+postgres stack works with auth required
