import base64
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from secrets import token_urlsafe
from threading import Lock
from typing import Any, Iterable

import quickjs
from Crypto.Cipher import AES

from app.db.models import DeviceCredential, UserDecoder


@dataclass(frozen=True)
class DecodeRow:
    status: str
    devaddr: str | None
    fcnt: int | None
    fport: int | None
    time: str | None
    payload_hex: str | None
    decoded_json: Any | None
    error: str | None


@dataclass(frozen=True)
class DecodeResult:
    token: str
    rows: list[DecodeRow]
    created_at: datetime
    expires_at: datetime


class DecodeCache:
    def __init__(self, ttl_minutes: int = 30) -> None:
        self._ttl = timedelta(minutes=ttl_minutes)
        self._items: dict[str, DecodeResult] = {}
        self._lock = Lock()

    def create(self, rows: list[DecodeRow]) -> DecodeResult:
        now = datetime.utcnow()
        result = DecodeResult(
            token=token_urlsafe(32),
            rows=rows,
            created_at=now,
            expires_at=now + self._ttl,
        )
        with self._lock:
            self._items[result.token] = result
        return result

    def get(self, token: str) -> DecodeResult | None:
        with self._lock:
            result = self._items.get(token)
            if not result:
                return None
            if result.expires_at <= datetime.utcnow():
                self._items.pop(token, None)
                return None
            return result


def _normalize_b64(data: str) -> str:
    stripped = data.strip()
    padding = (-len(stripped)) % 4
    if padding:
        stripped = f"{stripped}{'=' * padding}"
    return stripped


def _decode_b64(data: str) -> bytes:
    return base64.b64decode(_normalize_b64(data), validate=False)


def _devaddr_hex(devaddr_le: bytes) -> str:
    return devaddr_le[::-1].hex().upper()


def _decrypt_frm_payload(
    skey_hex: str,
    devaddr_le: bytes,
    fcnt: int,
    payload: bytes,
) -> bytes:
    if not payload:
        return b""
    skey = bytes.fromhex(skey_hex)
    cipher = AES.new(skey, AES.MODE_ECB)
    num_blocks = (len(payload) + 15) // 16
    output = bytearray(len(payload))

    for block_index in range(1, num_blocks + 1):
        a = bytearray(16)
        a[0] = 0x01
        a[5] = 0x00
        a[6:10] = devaddr_le
        a[10] = fcnt & 0xFF
        a[11] = (fcnt >> 8) & 0xFF
        a[12] = (fcnt >> 16) & 0xFF
        a[13] = (fcnt >> 24) & 0xFF
        a[15] = block_index & 0xFF

        s = cipher.encrypt(bytes(a))
        start = (block_index - 1) * 16
        end = min(block_index * 16, len(payload))
        for idx in range(start, end):
            output[idx] = payload[idx] ^ s[idx - start]

    return bytes(output)


def _parse_phy_payload(raw: bytes) -> tuple[str, int, int | None, bytes]:
    if len(raw) < 8:
        raise ValueError("Payload too short")

    devaddr_le = raw[1:5]
    fctrl = raw[5]
    fcnt = raw[6] | (raw[7] << 8)
    fopts_len = fctrl & 0x0F

    index = 8 + fopts_len
    if len(raw) <= index:
        return _devaddr_hex(devaddr_le), fcnt, None, b""

    fport = raw[index]
    frm_start = index + 1
    if len(raw) < frm_start + 4:
        return _devaddr_hex(devaddr_le), fcnt, fport, b""

    frm_payload = raw[frm_start:-4]
    return _devaddr_hex(devaddr_le), fcnt, fport, frm_payload


def _load_decoder_source(decoder_id: str, user_decoder: UserDecoder | None = None) -> str:
    if decoder_id.startswith("builtin:"):
        repo_root = Path(__file__).resolve().parents[3]
        decoder_path = repo_root / "decoders" / decoder_id.replace("builtin:", "", 1)
    else:
        if user_decoder is None:
            raise FileNotFoundError("Decoder not found")
        decoder_path = Path(user_decoder.storage_path)

    return decoder_path.read_text(encoding="utf-8")


def _run_js_decoder(source: str, payload: bytes, fport: int | None) -> Any:
    ctx = quickjs.Context()
    ctx.eval(source)
    bytes_list = list(payload)
    input_json = json.dumps({"bytes": bytes_list, "fPort": fport or 0})
    wrapper = (
        "(function() {"
        f"const input = {input_json};"
        "if (typeof decodeUplink === 'function') {"
        "  return JSON.stringify(decodeUplink({bytes: input.bytes, fPort: input.fPort}));"
        "}"
        "if (typeof Decoder === 'function') {"
        "  return JSON.stringify(Decoder(input.bytes, input.fPort));"
        "}"
        "return JSON.stringify(null);"
        "})()"
    )
    result = ctx.eval(wrapper)
    return json.loads(result) if result else None


def decode_jsonl_lines(
    lines: Iterable[str],
    credentials: dict[str, DeviceCredential],
    decoder_source: str | None,
    allowed_devaddrs: set[str] | None = None,
) -> list[DecodeRow]:
    rows: list[DecodeRow] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            rows.append(
                DecodeRow(
                    status="error",
                    devaddr=None,
                    fcnt=None,
                    fport=None,
                    time=None,
                    payload_hex=None,
                    decoded_json=None,
                    error="Invalid JSON",
                )
            )
            continue

        rxpk = record.get("rxpk")
        if not isinstance(rxpk, dict):
            rows.append(
                DecodeRow(
                    status="error",
                    devaddr=None,
                    fcnt=None,
                    fport=None,
                    time=None,
                    payload_hex=None,
                    decoded_json=None,
                    error="Missing rxpk",
                )
            )
            continue

        data = rxpk.get("data")
        if not isinstance(data, str):
            rows.append(
                DecodeRow(
                    status="error",
                    devaddr=None,
                    fcnt=None,
                    fport=None,
                    time=rxpk.get("time"),
                    payload_hex=None,
                    decoded_json=None,
                    error="Missing data",
                )
            )
            continue

        try:
            raw = _decode_b64(data)
            devaddr, fcnt, fport, frm_payload = _parse_phy_payload(raw)
        except Exception as exc:
            rows.append(
                DecodeRow(
                    status="error",
                    devaddr=None,
                    fcnt=None,
                    fport=None,
                    time=rxpk.get("time"),
                    payload_hex=None,
                    decoded_json=None,
                    error=str(exc),
                )
            )
            continue

        if allowed_devaddrs and devaddr not in allowed_devaddrs:
            continue

        credential = credentials.get(devaddr)
        if not credential:
            rows.append(
                DecodeRow(
                    status="error",
                    devaddr=devaddr,
                    fcnt=fcnt,
                    fport=fport,
                    time=rxpk.get("time"),
                    payload_hex=None,
                    decoded_json=None,
                    error="Missing device credentials",
                )
            )
            continue

        decrypted = frm_payload
        if fport is not None and frm_payload:
            key = credential.appskey if fport > 0 else credential.nwkskey
            decrypted = _decrypt_frm_payload(key, bytes.fromhex(devaddr)[::-1], fcnt, frm_payload)

        payload_hex = decrypted.hex().upper() if decrypted else ""
        decoded_json = None
        error = None

        if decoder_source:
            try:
                decoded_json = _run_js_decoder(decoder_source, decrypted, fport)
            except Exception as exc:
                error = f"Decoder error: {exc}"

        rows.append(
            DecodeRow(
                status="ok" if not error else "error",
                devaddr=devaddr,
                fcnt=fcnt,
                fport=fport,
                time=rxpk.get("time"),
                payload_hex=payload_hex,
                decoded_json=decoded_json,
                error=error,
            )
        )

    return rows
