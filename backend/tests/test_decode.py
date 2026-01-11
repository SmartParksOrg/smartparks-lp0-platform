import base64
import json

from app.db.models import DeviceCredential
from app.services.decode import _decrypt_frm_payload, decode_jsonl_lines


def _build_phy_payload(devaddr_hex: str, fcnt: int, fport: int, payload: bytes, appskey: str) -> bytes:
    devaddr_le = bytes.fromhex(devaddr_hex)[::-1]
    encrypted = _decrypt_frm_payload(appskey, devaddr_le, fcnt, payload)
    fcnt16 = fcnt & 0xFFFF
    mhdr = bytes([0x40])
    fhdr = devaddr_le + bytes([0x00, fcnt16 & 0xFF, (fcnt16 >> 8) & 0xFF])
    mac_payload = fhdr + bytes([fport]) + encrypted
    mic = b"\x00\x00\x00\x00"
    return mhdr + mac_payload + mic


def test_decode_jsonl_lines_decrypts_and_runs_decoder():
    devaddr = "26011BDA"
    appskey = "000102030405060708090A0B0C0D0E0F"
    nwkskey = "F0E0D0C0B0A090807060504030201000"
    plaintext = bytes([1, 2, 3, 4])

    phy_payload = _build_phy_payload(devaddr, 1, 1, plaintext, appskey)
    payload_b64 = base64.b64encode(phy_payload).decode("ascii")

    line = json.dumps({"gatewayEui": "0102030405060708", "rxpk": {"time": "2025-01-01T00:00:00Z", "data": payload_b64}})

    credential = DeviceCredential(
        devaddr=devaddr,
        nwkskey=nwkskey,
        appskey=appskey,
    )
    decoder_source = """
    function decodeUplink(input) {
      const sum = input.bytes.reduce((acc, value) => acc + value, 0);
      return { data: { sum: sum } };
    }
    """

    rows = decode_jsonl_lines([line], {devaddr: credential}, decoder_source, None)

    assert len(rows) == 1
    row = rows[0]
    assert row.status == "ok"
    assert row.devaddr == devaddr
    assert row.payload_hex == plaintext.hex().upper()
    assert row.decoded_json == {"data": {"sum": 10}}
