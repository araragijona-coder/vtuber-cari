from __future__ import annotations

import os
import time
from dataclasses import dataclass, field


@dataclass(slots=True)
class UsageStats:
    """Small dependency-free runtime usage counters for the desktop UI."""

    local_responses: int = 0
    ollama_calls: int = 0
    api_calls: int = 0
    provider_failures: int = 0
    last_provider: str = "local"
    last_latency_ms: float = 0.0
    _started: float = field(default_factory=time.perf_counter, repr=False)
    _cpu_started: float = field(default_factory=time.process_time, repr=False)

    def record(self, provider: str, latency_ms: float = 0.0, success: bool = True) -> None:
        if provider == "local":
            self.local_responses += 1
        elif provider == "ollama":
            self.ollama_calls += 1
        elif provider == "api":
            self.api_calls += 1
        if not success:
            self.provider_failures += 1
        self.last_provider = provider
        self.last_latency_ms = max(0.0, latency_ms)

    def snapshot(self) -> dict[str, object]:
        elapsed = max(0.001, time.perf_counter() - self._started)
        cpu_elapsed = max(0.0, time.process_time() - self._cpu_started)
        cpu_percent = min(100.0, (cpu_elapsed / elapsed) * 100.0 / max(1, os.cpu_count() or 1))
        return {
            "cpu_percent": cpu_percent,
            "local": self.local_responses,
            "ollama": self.ollama_calls,
            "api": self.api_calls,
            "failures": self.provider_failures,
            "last": self.last_provider,
            "latency_ms": self.last_latency_ms,
        }
