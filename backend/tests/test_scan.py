from pathlib import Path

from app.services.scan import scan_jsonl_path


def test_scan_jsonl_path_extracts_gateway_euis_and_devaddrs():
    repo_root = Path(__file__).resolve().parents[2]
    sample_path = repo_root / "testdata" / "scan_sample.jsonl"

    summary = scan_jsonl_path(sample_path)

    assert summary["record_count"] == 3
    assert summary["gateway_euis"] == ["0102030405060708", "AABBCCDDEEFF0011"]
    assert summary["devaddrs"] == ["01020304", "26011BDA"]
