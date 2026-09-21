from experimental.avatar.acting_state import AvatarActingState
from experimental.avatar.fake_renderer import FakeRenderer


def test_renderer_lifecycle_and_acting_state() -> None:
    renderer = FakeRenderer()
    assert not renderer.is_loaded()

    renderer.load("Cari.vrm")
    renderer.set_acting_state(
        AvatarActingState(emotion="happy", body_animation="wave", lip_sync="aa")
    )
    renderer.set_camera_preset("three_quarter")
    renderer.update(1 / 60)

    assert renderer.is_loaded()
    assert renderer.model_path == "Cari.vrm"
    assert renderer.camera_preset == "three_quarter"
    assert renderer.acting_state.emotion == "happy"
    assert renderer.get_metrics()["updates"] == 1

    renderer.unload()
    assert not renderer.is_loaded()
    assert renderer.model_path is None


def test_renderer_rejects_invalid_inputs() -> None:
    renderer = FakeRenderer()

    for bad_path in ("", "   "):
        try:
            renderer.load(bad_path)
        except ValueError:
            pass
        else:
            raise AssertionError("empty model paths must be rejected")

    try:
        renderer.set_camera_preset("unknown")
    except ValueError:
        pass
    else:
        raise AssertionError("unknown camera presets must be rejected")

    try:
        renderer.update(-0.01)
    except ValueError:
        pass
    else:
        raise AssertionError("negative delta must be rejected")
