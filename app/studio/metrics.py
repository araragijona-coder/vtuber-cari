"""Simple, dependency-free health metrics for the creator dashboard.

These values deliberately avoid pretending that a single percentage is a
universal quality score. Each metric reports a bounded percentage plus a
human-readable status so a streamer can understand it at a glance.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class HealthMetric:
    name: str
    percent: float
    status: str

    def __post_init__(self) -> None:
        if not 0.0 <= self.percent <= 100.0:
            raise ValueError("metric percent must be between 0 and 100")
        if not self.name.strip():
            raise ValueError("metric name cannot be empty")


def utilization_metric(name: str, utilization_percent: float) -> HealthMetric:
    """Represent resource utilization without hiding the raw percentage."""
    value = float(utilization_percent)
    if not 0.0 <= value <= 100.0:
        raise ValueError("utilization must be between 0 and 100")
    if value < 60.0:
        status = "bien"
    elif value < 85.0:
        status = "atención"
    else:
        status = "alto"
    return HealthMetric(name=name, percent=round(value, 1), status=status)


def quality_metric(name: str, quality_percent: float) -> HealthMetric:
    """Represent a normalized quality score from 0 to 100."""
    value = float(quality_percent)
    if not 0.0 <= value <= 100.0:
        raise ValueError("quality must be between 0 and 100")
    if value >= 90.0:
        status = "excelente"
    elif value >= 75.0:
        status = "bien"
    elif value >= 50.0:
        status = "atención"
    else:
        status = "problema"
    return HealthMetric(name=name, percent=round(value, 1), status=status)
