from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json


@dataclass(frozen=True, slots=True)
class LayerFingerprint:
    name: str
    value: str


@dataclass(frozen=True, slots=True)
class RenderPlan:
    layers: tuple[LayerFingerprint, ...]

    @property
    def fingerprint(self) -> str:
        payload = [(layer.name, layer.value) for layer in self.layers]
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


class RenderCache:
    def __init__(self) -> None:
        self._cache: dict[str, RenderPlan] = {}

    def get(self, plan: RenderPlan) -> RenderPlan | None:
        return self._cache.get(plan.fingerprint)

    def put(self, plan: RenderPlan) -> RenderPlan:
        self._cache[plan.fingerprint] = plan
        return plan

    def clear(self) -> None:
        self._cache.clear()
