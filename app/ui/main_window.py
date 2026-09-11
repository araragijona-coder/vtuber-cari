from __future__ import annotations

import tkinter as tk
from tkinter import ttk

from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage


class CariWindow:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Cari — VTuber Project")
        self.root.geometry("760x520")
        self.pipeline = LocalPipeline()
        self.chat = tk.Text(root, height=20, state="disabled")
        self.chat.pack(fill="both", expand=True, padx=12, pady=12)
        row = ttk.Frame(root)
        row.pack(fill="x", padx=12, pady=(0, 12))
        self.entry = ttk.Entry(row)
        self.entry.pack(side="left", fill="x", expand=True)
        ttk.Button(row, text="Enviar", command=self.send).pack(side="left", padx=(8, 0))
        self.entry.bind("<Return>", lambda _event: self.send())
        self._write("Cari está lista. Modo local-first activo.")

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
        else:
            self._write(f"Cari: {result.response_text}")


def run() -> None:
    root = tk.Tk()
    CariWindow(root)
    root.mainloop()
