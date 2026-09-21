"""Local Cari Studio services.

The studio package contains deterministic, dependency-light creator controls.
External platforms and optional AI providers belong behind adapters.
"""

from .runtime_bindings import (
    BackendExecution,
    BackendPreference,
    NativeBackend,
    OBSBackend,
    StudioRuntimeBindings,
)

__all__ = [
    "BackendExecution",
    "BackendPreference",
    "NativeBackend",
    "OBSBackend",
    "StudioRuntimeBindings",
]
