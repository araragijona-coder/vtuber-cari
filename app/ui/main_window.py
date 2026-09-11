from __future__ import annotations

import os
import tkinter as tk
from pathlib import Path
from tkinter import ttk

from app.avatar.controller import AvatarCommand
from app.avatar.renderer import AvatarRenderer
from app.brain.contracts import Emotion
from app.intelligence.llm import LLMConfig, LocalFirstResponder, OllamaClient, OpenAICompatibleClient
from app.memory.persistent import PersistentMemoryStore
from app.monitor.usage import UsageStats
from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage
from app.voice.tts import build_tts


class CariWindow:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Cari — VTuber Project")
        self.root.geometry("1180x720")
        self.root.minsize(980, 600)
        self.root.protocol("WM_DELETE_WINDOW", self.close)

        self.memory = PersistentMemoryStore(Path("data") / "cari-memory.json")
        self.usage = UsageStats()
        self._ai_enabled = True
        self._build_pipeline()

        main = ttk.Frame(root, padding=12)
        main.pack(fill="both", expand=True)
        main.columnconfigure(0, weight=1)
        main.columnconfigure(1, weight=0)
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
        panel.configure(width=360)
        panel.rowconfigure(2, weight=1)
        panel.columnconfigure(0, weight=1)

        mode_box = ttk.LabelFrame(panel, text="Modo de trabajo", padding=8)
        mode_box.grid(row=0, column=0, sticky="ew")
        self.mode_label = ttk.Label(mode_box, text="IA activa · local → Ollama → API")
        self.mode_label.grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 6))
        self.mode_var = tk.StringVar(value="ia")
        ttk.Radiobutton(mode_box, text="🤖 Trabajar modo IA", value="ia", variable=self.mode_var, command=self._set_work_mode).grid(row=1, column=0, sticky="w")
        ttk.Radiobutton(mode_box, text="🛠 Trabajar manual", value="manual", variable=self.mode_var, command=self._set_work_mode).grid(row=1, column=1, sticky="w", padx=(12, 0))

        controls = ttk.LabelFrame(panel, text="Controles de aplicación", padding=8)
        controls.grid(row=1, column=0, sticky="ew", pady=(8, 0))
        self.manual_status = ttk.Label(controls, text="Controles manuales disponibles")
        self.manual_status.grid(row=0, column=0, columnspan=3, sticky="w", pady=(0, 6))
        for column, (label, emotion, animation) in enumerate((
            ("Normal", Emotion.NEUTRAL, "idle"),
            ("Feliz", Emotion.HAPPY, "happy"),
            ("Pensar", Emotion.PLAYFUL, "thinking"),
        )):
            ttk.Button(controls, text=label, command=lambda e=emotion, a=animation: self._manual_avatar(e, a)).grid(row=1, column=column, padx=2, sticky="ew")
        self.manual_speak = ttk.Button(controls, text="Hablar texto escrito", command=self._manual_speak)
        self.manual_speak.grid(row=2, column=0, columnspan=3, sticky="ew", pady=(6, 0))
        for column in range(3):
            controls.columnconfigure(column, weight=1)

        self.chat = tk.Text(panel, height=18, state="disabled", wrap="word")
        self.chat.grid(row=2, column=0, sticky="nsew", pady=(8, 0))

        row = ttk.Frame(panel)
        row.grid(row=3, column=0, sticky="ew", pady=(8, 0))
        row.columnconfigure(0, weight=1)
        self.entry = ttk.Entry(row)
        self.entry.grid(row=0, column=0, sticky="ew")
        ttk.Button(row, text="Enviar", command=self.send).grid(row=0, column=1, padx=(8, 0))
        self.entry.bind("<Return>", lambda _event: self.send())

        ai_box = ttk.LabelFrame(panel, text="Servicios que requieren inteligencia", padding=8)
        ai_box.grid(row=4, column=0, sticky="ew", pady=(8, 0))
        self.ai_status = ttk.Label(ai_box, text="🔓 IA disponible: Ollama primero; API solo como respaldo")
        self.ai_status.grid(row=0, column=0, sticky="w")
        self.ai_lock = ttk.Label(ai_box, text="🔓 Controles IA habilitados")
        self.ai_lock.grid(row=1, column=0, sticky="w", pady=(4, 0))

        self.usage_label = ttk.Label(panel, text="CPU: 0% · local: 0 · Ollama: 0 · API: 0 · errores: 0", anchor="w")
        self.usage_label.grid(row=5, column=0, sticky="ew", pady=(8, 0))
        self._write("Cari está lista · IA: habilitada · TTS: local")
        self.entry.focus_set()
        self._refresh_usage()

    def _build_pipeline(self) -> None:
        responder, ai_status = self._build_responder() if self._ai_enabled else (None, "manual-only")
        default_tts = "pyttsx3" if os.name == "nt" else "none"
        tts_kind = os.getenv("CARI_TTS", default_tts)
        try:
            tts = build_tts(tts_kind)
            tts_status = tts_kind
        except RuntimeError as exc:
            tts = build_tts("none")
            tts_status = f"none ({exc})"
        self.pipeline = LocalPipeline(persistent_memory=self.memory, responder=responder, tts=tts, usage=self.usage)
        self._ai_status_text = ai_status
        self._tts_status = tts_status

    @staticmethod
    def _build_responder():
        """Local rules first; Ollama second; cloud API only as a fallback."""
        mode = os.getenv("CARI_LLM_MODE", "auto").strip().casefold()
        if mode == "local":
            return None, "local-only"
        if mode == "ollama":
            return OllamaClient(), "ollama-local"
        if mode == "api":
            config = LLMConfig.from_env()
            return (OpenAICompatibleClient(config), "api-forced") if config is not None else (None, "local-only (API not configured)")
        if mode == "auto":
            ollama = OllamaClient()
            config = LLMConfig.from_env()
            api = OpenAICompatibleClient(config) if config is not None else None
            return LocalFirstResponder(ollama, api), "auto: local → Ollama → API"
        return None, f"local-only (unknown mode: {mode})"

    def _set_work_mode(self) -> None:
        self._ai_enabled = self.mode_var.get() == "ia"
        self._build_pipeline()
        if self._ai_enabled:
            self.mode_label.configure(text=f"IA activa · {self._ai_status_text}")
            self.manual_status.configure(text="Controles manuales disponibles aunque la IA esté activa")
            self.ai_status.configure(text="🔓 IA disponible: Ollama primero; API solo como respaldo")
            self.ai_lock.configure(text="🔓 Controles IA habilitados")
        else:
            self.mode_label.configure(text="Modo manual · no se llama a Ollama ni a ninguna API")
            self.manual_status.configure(text="🛠 Controles manuales habilitados")
            self.ai_status.configure(text="🔒 IA bloqueada: no se usan modelos ni APIs")
            self.ai_lock.configure(text="🔒 Ollama / API / funciones IA bloqueadas")
        self._write("[Modo] " + ("IA" if self._ai_enabled else "MANUAL"))

    def _manual_avatar(self, emotion: Emotion, animation: str) -> None:
        command = AvatarCommand(emotion=emotion, intensity=0.7, animation=animation, speaking=False)
        self.pipeline.avatar.apply(command)
        self.avatar.set_command(command)
        self._write(f"[Manual] Avatar: {animation}")

    def _manual_speak(self) -> None:
        text = self.entry.get().strip()
        if not text:
            self._write("[Manual] Escribe primero el texto que Cari debe decir.")
            return
        error = self.pipeline.speak_manual(text)
        if error:
            self._write(f"[TTS error] {error}")
        else:
            self._write(f"Cari (manual): {text}")

    def _write(self, text: str) -> None:
        self.chat.configure(state="normal")
        self.chat.insert("end", text + "\n")
        self.chat.see("end")
        self.chat.configure(state="disabled")

    def _refresh_usage(self) -> None:
        data = self.usage.snapshot()
        self.usage_label.configure(
            text=(f"CPU proceso: {data['cpu_percent']:.1f}% · local: {data['local']} · "
                  f"Ollama: {data['ollama']} · API: {data['api']} · "
                  f"errores: {data['failures']} · último: {data['last']} ({data['latency_ms']:.0f} ms)")
        )
        self.root.after(1000, self._refresh_usage)

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
            self._write(f"[IA degradada: {result.llm_error}]")
        if result.tts_error:
            self._write(f"[TTS degradado: {result.tts_error}]")

    def close(self) -> None:
        self.avatar.stop()
        self.root.destroy()


def run() -> None:
    root = tk.Tk()
    CariWindow(root)
    root.mainloop()
