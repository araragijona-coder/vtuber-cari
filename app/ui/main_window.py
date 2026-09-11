from __future__ import annotations

import os
import tkinter as tk
from pathlib import Path
from tkinter import ttk

from app.avatar.renderer import AvatarRenderer
from app.intelligence.llm import LLMConfig, OpenAICompatibleClient
from app.memory.persistent import PersistentMemoryStore
from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage
from app.voice.tts import build_tts


class CariWindow:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Cari — VTuber Project")
        self.root.geometry("1120x680")
        self.root.minsize(900, 560)
        self.root.protocol("WM_DELETE_WINDOW", self.close)

        memory = PersistentMemoryStore(Path("data") / "cari-memory.json")
        llm_config = LLMConfig.from_env()
        responder = OpenAICompatibleClient(llm_config) if llm_config is not None else None

        # Windows builds prefer the local SAPI-backed adapter so the packaged
        # application can speak immediately when pyttsx3 is bundled. Linux/CI
        # remains silent unless a provider is explicitly configured.
        default_tts = "pyttsx3" if os.name == "nt" else "none"
        tts_kind = os.getenv("CARI_TTS", default_tts)
        try:
            tts = build_tts(tts_kind)
            tts_status = tts_kind
        except RuntimeError as exc:
            tts = build_tts("none")
            tts_status = f"none ({exc})"

        self.pipeline = LocalPipeline(
            persistent_memory=memory,
            responder=responder,
            tts=tts,
        )

        main = ttk.Frame(root, padding=12)
        main.pack(fill="both", expand=True)
        main.columnconfigure(0, weight=1)
        main.rowconfigure(0, weight=1)

        stage = ttk.Frame(main)
        stage.grid(row=0, column=0, sticky="nsew", padx=(0, 12))
        stage.columnconfigure(0, weight=1)
        stage.rowconfigure(0, weight=1)
        self.avatar_canvas = tk.Canvas(stage, width=420, height=420, highlightthickness=0)
        self.avatar_canvas.grid(row=0, column=0, sticky="nsew")
        self.avatar = AvatarRenderer(self.avatar_canvas)
        self.avatar.start()

        panel = ttk.Frame(main)
        panel.grid(row=0, column=1, sticky="nsew")
        panel.rowconfigure(0, weight=1)
        panel.columnconfigure(0, weight=1)
        self.chat = tk.Text(panel, height=20, state="disabled", wrap="word")
        self.chat.grid(row=0, column=0, sticky="nsew")

        row = ttk.Frame(panel)
        row.grid(row=1, column=0, sticky="ew", pady=(8, 0))
        row.columnconfigure(0, weight=1)
        self.entry = ttk.Entry(row)
        self.entry.grid(row=0, column=0, sticky="ew")
        ttk.Button(row, text="Enviar", command=self.send).grid(row=0, column=1, padx=(8, 0))
        self.entry.bind("<Return>", lambda _event: self.send())

        llm_status = "configurado" if responder is not None else "local-only"
        self._write(f"Cari está lista · LLM: {llm_status} · TTS: {tts_status}")
        self.entry.focus_set()

    def _write(self, text: str) -> None:
        self.chat.configure(state="normal")
        self.chat.insert("end", text + "\n")
        self.chat.see("end")
        self.chat.configure(state="disabled")

    def send(self) -> None:
        text = self.entry.get().strip()
        if not text:
            return
        self.entry.delete(0, "end")
        self._write(f"Tú: {text}")
        result = self.pipeline.handle(ChatMessage.now("local", "local_user", text))
        if result is None:
            self._write("Cari: todavía no tengo una respuesta local para eso.")
            return
        self.avatar.set_command(result.avatar_command)
        self._write(f"Cari: {result.response_text}")
        if result.llm_error:
            self._write(f"[LLM degradado: {result.llm_error}]")
        if result.tts_error:
            self._write(f"[TTS degradado: {result.tts_error}]")

    def close(self) -> None:
        self.avatar.stop()
        self.root.destroy()


def run() -> None:
    root = tk.Tk()
    CariWindow(root)
    root.mainloop()
