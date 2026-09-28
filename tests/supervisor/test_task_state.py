from pathlib import Path
from app.supervisor.task_state import TaskState


def test_create_save_load_update_phase(tmp_path: Path):
    path = tmp_path / "state.json"
    state = TaskState(task_id="TASK-001", task="demo", repo="repo")
    state.save(path)
    loaded = TaskState.load(path)
    assert loaded.task_id == "TASK-001"
    loaded.set_phase("REPO_SCAN")
    loaded.save(path)
    again = TaskState.load(path)
    assert again.phase == "REPO_SCAN"
    assert again.repo == "repo"
