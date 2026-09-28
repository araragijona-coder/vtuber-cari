import subprocess
from pathlib import Path
from app.supervisor import Supervisor


def make_repo(tmp_path: Path) -> Path:
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path, check=True)
    (tmp_path / "a.txt").write_text("one", encoding="utf-8")
    subprocess.run(["git", "add", "a.txt"], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-qm", "initial"], cwd=tmp_path, check=True)
    return tmp_path


def test_supervisor_create_observe_checkpoint_and_consistency(tmp_path: Path):
    root = make_repo(tmp_path)
    sup = Supervisor(root)
    sup.create_task("TASK-001", "observe", "repo")
    observed = sup.observe_repository()
    assert observed["head_sha"] == sup.load_task().current_sha
    eid = sup.record_command(["git", "rev-parse", "HEAD"])
    assert sup.evidence.get(eid) is not None
    sup.observe_file("a.txt")
    checkpoint = sup.create_checkpoint("checkpoint-initial")
    assert checkpoint.exists()
    assert sup.consistency() == "CONSISTENT"


def test_supervisor_detects_inconsistency(tmp_path: Path):
    root = make_repo(tmp_path)
    sup = Supervisor(root)
    sup.create_task("TASK-002")
    sup.observe_repository()
    (root / "b.txt").write_text("uncommitted", encoding="utf-8")
    assert sup.consistency() == "CONSISTENT"
    state = sup.load_task()
    state.current_sha = "0" * 40
    sup.save_task(state)
    assert sup.consistency() == "INCONSISTENT"
