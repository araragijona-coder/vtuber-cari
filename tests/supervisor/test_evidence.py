from pathlib import Path
from app.supervisor.evidence import Evidence, EvidenceStore, redact, new_id


def test_evidence_persistence_and_unique_ids(tmp_path: Path):
    store = EvidenceStore(tmp_path / "evidence.json")
    a, b = new_id(), new_id()
    assert a != b
    store.add(Evidence(a, "COMMAND", "test", "2026-01-01T00:00:00Z", "EXECUTED", command="echo ok", exit_code=0, stdout="ok"))
    store.add(Evidence(b, "FILE", "test", "2026-01-01T00:00:00Z", "INSPECTED", path="x", exists=False))
    loaded = EvidenceStore(tmp_path / "evidence.json")
    assert len(loaded) == 2
    assert loaded.get(a)["stdout"] == "ok"


def test_secret_redaction():
    text = "CARI_LLM_API_KEY=abc123 Authorization: Bearer xyz987 CARI_TWITCH_CLIENT_SECRET=secret"
    out = redact(text)
    assert "abc123" not in out and "xyz987" not in out and "secret" not in out
    assert out.count("[REDACTED]") == 3


def test_secret_dict_redaction():
    out = redact({"api_key": "abc", "authorization": "Bearer xyz", "safe": "ok"})
    assert out == {"api_key": "[REDACTED]", "authorization": "[REDACTED]", "safe": "ok"}
