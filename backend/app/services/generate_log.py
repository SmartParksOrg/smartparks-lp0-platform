import base64
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable


def _clean_hex(value: str) -> str:
    return value.replace(" ", "").replace(":", "").replace("-", "").strip()


def _devaddr_to_le(devaddr_hex: str) -> bytes:
    cleaned = _clean_hex(devaddr_hex)
    if len(cleaned) != 8:
        raise ValueError("DevAddr must be 4 bytes (8 hex chars)")
    return bytes.fromhex(cleaned)[::-1]


def _payload_bytes(payload_hex: str | None) -> bytes:
    if not payload_hex:
        return b""
    cleaned = _clean_hex(payload_hex)
    if len(cleaned) % 2 != 0:
        raise ValueError("Payload hex must be byte-aligned")
    return bytes.fromhex(cleaned)


def _build_phy_payload(devaddr_le: bytes, fcnt: int, payload: bytes) -> bytes:
    fcnt16 = fcnt & 0xFFFF
    base = bytes([0x40]) + devaddr_le + bytes([fcnt16 & 0xFF, (fcnt16 >> 8) & 0xFF])
    return base + payload


@dataclass(frozen=True)
class GenerateLogParams:
    gateway_eui: str
    devaddr: str
    frames: int
    interval_seconds: int
    start_time: datetime
    frequency_mhz: float
    datarate: str
    coding_rate: str
    payload_hex: str | None = None


def generate_jsonl(params: GenerateLogParams) -> Iterable[str]:
    devaddr_le = _devaddr_to_le(params.devaddr)
    payload = _payload_bytes(params.payload_hex)

    for index in range(params.frames):
        fcnt = index
        phy_payload = _build_phy_payload(devaddr_le, fcnt, payload)
        encoded = base64.b64encode(phy_payload).decode("ascii")
        timestamp = params.start_time + timedelta(seconds=index * params.interval_seconds)

        rxpk = {
            "time": timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tmst": 1000000 + index * 1000,
            "freq": params.frequency_mhz,
            "chan": 0,
            "rfch": 0,
            "stat": 1,
            "modu": "LORA",
            "datr": params.datarate,
            "codr": params.coding_rate,
            "rssi": -60 - (index % 20),
            "lsnr": 5.5 - (index % 10) * 0.1,
            "size": len(phy_payload),
            "data": encoded,
        }

        record = {"gatewayEui": params.gateway_eui, "rxpk": rxpk}
        yield json.dumps(record) + "\n"
