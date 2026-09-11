from __future__ import annotations

import traceback
from pathlib import Path
import tkinter as tk
from tkinter import messagebox


def run_safely(run_app) -> None:
    """Start Cari and stop visibly on startup failures with a copyable log."""
    root_dir = Path(__file__).resolve().parents[2]
    error_dir = root_dir / "data"
    error_dir.mkdir(parents=True, exist_ok=True)
    error_file = error_dir / "last-startup-error.txt"
    try:
        run_app()
    except Exception as exc:  # startup guard: diagnostics must survive any app error
        details = "Cari no pudo iniciar.\n\n" + "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        error_file.write_text(details, encoding="utf-8")
        try:
            dialog = tk.Tk()
            dialog.withdraw()
            messagebox.showerror(
                "Cari no pudo iniciar",
                "Cari se detuvo para evitar continuar con un error.\n\n"
                f"{exc}\n\n"
                f"Copia este archivo y pásamelo:\n{error_file}",
                parent=dialog,
            )
            dialog.destroy()
        except Exception:
            print(details)
        raise
