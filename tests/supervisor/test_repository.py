import subprocess
from pathlib import Path
from app.supervisor.repository import RepositoryObserver


def make_repo(tmp_path: Path) -> Path:
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path, check=True)
    (tmp_path / "a.txt").write_text("one", encoding="utf-8")
    subprocess.run(["git", "add", "a.txt"], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-qm", "initial"], cwd=tmp_path, check=True)
    return tmp_path


def test_git_and_filesystem_observation(tmp_path: Path):
    root = make_repo(tmp_path)
    obs = RepositoryObserver(root)
    assert len(obs.head_sha()) == 40
    assert obs.branch() in {"master", "main"}
    assert obs.status() == ""
    (root / "a.txt").write_text("two", encoding="utf-8")
    assert obs.changed_files() == [{"status": "M", "path": "a.txt"}]
    file_obs = obs.observe_file("a.txt")
    assert file_obs.exists and file_obs.type == "file" and len(file_obs.hash) == 64
    assert obs.observe_file("missing.txt").exists is False
    assert obs.observe_file(".").type == "directory"


def test_path_traversal_rejected(tmp_path: Path):
    root = make_repo(tmp_path)
    obs = RepositoryObserver(root)
    try:
        obs.observe_file("../outside")
    except ValueError:
        pass
    else:
        raise AssertionError("path traversal accepted")
