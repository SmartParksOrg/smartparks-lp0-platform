import json
import socket
from dataclasses import dataclass
from secrets import token_bytes
from typing import Iterable


@dataclass(frozen=True)
class ReplayRow:
    status: str
    gateway_eui: str | None
    frequency: float | None
    size: int | None
    message: str


def _normalize_hex(value: str) -> str:
    return value.replace(" ", "").replace(":", "").replace("-", "").strip().upper()


def _build_packet(gateway_eui: str, rxpk: dict) -> bytes:
    eui_hex = _normalize_hex(gateway_eui)
    if len(eui_hex) != 16:
        raise ValueError("Invalid gateway EUI")
    eui = bytes.fromhex(eui_hex)
    token = token_bytes(2)
    payload = json.dumps({"rxpk": [rxpk]}).encode("utf-8")
    return b"\x02" + token + b"\x00" + eui + payload


def replay_jsonl_lines(
    lines: Iterable[str],
    udp_host: str,
    udp_port: int,
    timeout_seconds: float = 2.0,
) -> list[ReplayRow]:
    rows: list[ReplayRow] = []
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout_seconds)

    try:
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                rows.append(
                    ReplayRow(
                        status="error",
                        gateway_eui=None,
                        frequency=None,
                        size=None,
                        message="Invalid JSON",
                    )
                )
                continue

            gateway = record.get("gatewayEui")
            rxpk = record.get("rxpk")
            if not isinstance(gateway, str) or not isinstance(rxpk, dict):
                rows.append(
                    ReplayRow(
                        status="error",
                        gateway_eui=gateway if isinstance(gateway, str) else None,
                        frequency=None,
                        size=None,
                        message="Missing gatewayEui or rxpk",
                    )
                )
                continue

            try:
                packet = _build_packet(gateway, rxpk)
                sock.sendto(packet, (udp_host, udp_port))
                rows.append(
                    ReplayRow(
                        status="sent",
                        gateway_eui=gateway,
                        frequency=rxpk.get("freq"),
                        size=rxpk.get("size"),
                        message="Sent",
                    )
                )
            except Exception as exc:
                rows.append(
                    ReplayRow(
                        status="error",
                        gateway_eui=gateway,
                        frequency=rxpk.get("freq"),
                        size=rxpk.get("size"),
                        message=str(exc),
                    )
                )
    finally:
        sock.close()

    return rows
