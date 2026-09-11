from .acting_state import AvatarActingState
from .renderer_protocol import AvatarRenderer


class FakeRenderer:
    def __init__(self) -> None:
        self.loaded = False
        self.state = AvatarActingState()
        self.camera = "full_body"

    def load(self, model_path: str) -> None:
        self.loaded = bool(model_path)

    def unload(self) -> None:
        self.loaded = False

    def is_loaded(self) -> bool:
        return self.loaded

    def update(self, delta_seconds: float) -> None:
        if delta_seconds < 0:
            raise ValueError("delta_seconds must not be negative")

    def set_acting_state(self, state: AvatarActingState) -> None:
        self.state = state

    def set_camera_preset(self, name: str) -> None:
        self.camera = name

    def get_metrics(self) -> dict[str, float | int | bool | None]:
        return {"loaded": self.loaded, "frame_time_ms": None, "fps_estimate": None}


def test_fake_backend_matches_protocol() -> None:
    renderer: AvatarRenderer = FakeRenderer()
    renderer.load("Cari.vrm")
    renderer.set_acting_state(AvatarActingState(emotion="thinking"))
    renderer.set_camera_preset("three_quarter")
    renderer.update(1 / 60)

    assert renderer.is_loaded()
    assert renderer.get_metrics()["loaded"] is True
