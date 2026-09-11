from __future__ import annotations

from dataclasses import dataclass
import math
import tkinter as tk

from .controller import AvatarCommand


@dataclass(slots=True)
class AvatarRenderer:
    """Dependency-free Tk canvas renderer for Cari's fallback avatar.

    The renderer deliberately consumes only the neutral AvatarCommand contract.
    A future PNG/Live2D/VRM renderer can replace this class without changing the
    brain, pipeline or Twitch layers.
    """

    canvas: tk.Canvas
    width: int = 420
    height: int = 420
    _phase: float = 0.0
    _command: AvatarCommand | None = None
    _job: str | None = None

    def set_command(self, command: AvatarCommand) -> None:
        self._command = command
        self.draw()

    def start(self) -> None:
        if self._job is None:
            self._tick()

    def stop(self) -> None:
        if self._job is not None:
            self.canvas.after_cancel(self._job)
            self._job = None

    def _tick(self) -> None:
        self._phase = (self._phase + 0.18) % (math.pi * 2)
        self.draw()
        self._job = self.canvas.after(50, self._tick)

    def draw(self) -> None:
        self.canvas.delete("all")
        self.canvas.configure(width=self.width, height=self.height)
        command = self._command
        intensity = command.intensity if command is not None else 0.5
        speaking = bool(command.speaking) if command is not None else False
        emotion = command.emotion if command is not None else "neutral"
        bob = math.sin(self._phase) * (3.0 + 3.0 * intensity)
        cx = self.width / 2
        cy = self.height * 0.54 + bob

        # Background and a deliberately simple, readable fallback character.
        self.canvas.create_rectangle(0, 0, self.width, self.height, fill="#171a24", outline="")
        self.canvas.create_oval(cx - 105, cy - 105, cx + 105, cy + 105, fill="#f0c9a4", outline="#11131a", width=3)
        self.canvas.create_polygon(
            cx - 98, cy - 72, cx - 145, cy - 150, cx - 42, cy - 104,
            fill="#262a39", outline="#11131a", width=3,
        )
        self.canvas.create_polygon(
            cx + 98, cy - 72, cx + 145, cy - 150, cx + 42, cy - 104,
            fill="#262a39", outline="#11131a", width=3,
        )

        eye_y = cy - 5
        eye_shift = 4 if emotion in {"happy", "playful", "affectionate"} else 0
        self.canvas.create_oval(cx - 58, eye_y - 10, cx - 42, eye_y + 10, fill="#10121a", outline="")
        self.canvas.create_oval(cx + 42, eye_y - 10, cx + 58, eye_y + 10, fill="#10121a", outline="")
        self.canvas.create_oval(cx - 54, eye_y - 7 - eye_shift, cx - 48, eye_y - 1 - eye_shift, fill="#ffffff", outline="")
        self.canvas.create_oval(cx + 46, eye_y - 7 - eye_shift, cx + 52, eye_y - 1 - eye_shift, fill="#ffffff", outline="")

        mouth_open = speaking or emotion == "surprised"
        if mouth_open:
            self.canvas.create_oval(cx - 18, cy + 35, cx + 18, cy + 62, fill="#321c2b", outline="#11131a", width=2)
        else:
            self.canvas.create_arc(cx - 22, cy + 28, cx + 22, cy + 58, start=200, extent=140, style="arc", outline="#11131a", width=3)

        label = "HABLANDO" if speaking else emotion.upper()
        self.canvas.create_text(cx, self.height - 24, text=f"CARI · {label}", fill="#f4f4f5", font=("Segoe UI", 10, "bold"))
