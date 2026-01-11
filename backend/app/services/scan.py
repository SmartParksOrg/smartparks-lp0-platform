import base64
import json
from pathlib import Path
from typing import IO, Any


def _normalize_b64(data: str) -> str:
    stripped = data.strip()
    padding = (-len(stripped)) % 4
    if padding:
        stripped = f"{stripped}{'=' * padding}"
    return stripped


def _extract_devaddr(payload_b64: str) -> str | None:
    try:
        raw = base64.b64decode(_normalize_b64(payload_b64), validate=False)
    except (ValueError, TypeError):
        return None

    if len(raw) < 5:
        return None

    devaddr_le = raw[1:5]
    return devaddr_le[::-1].hex().upper()


def scan_jsonl_stream(stream: IO[str]) -> dict[str, Any]:
    record_count = 0
    gateway_euis: set[str] = set()
    devaddrs: set[str] = set()

    for line in stream:
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue

        record_count += 1

        gateway = record.get("gatewayEui") or record.get("gateway_eui")
        if isinstance(gateway, str) and gateway.strip():
            gateway_euis.add(gateway.strip())

        rxpk = record.get("rxpk")
        if isinstance(rxpk, dict):
            data = rxpk.get("data")
            if isinstance(data, str):
                devaddr = _extract_devaddr(data)
                if devaddr:
                    devaddrs.add(devaddr)

    return {
        "record_count": record_count,
        "gateway_euis": sorted(gateway_euis),
        "devaddrs": sorted(devaddrs),
    }


def scan_jsonl_path(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return scan_jsonl_stream(handle)
