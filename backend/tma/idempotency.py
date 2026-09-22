from __future__ import annotations

import asyncio
import copy
import hashlib
import json
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Mapping, TypeVar

T = TypeVar("T")


class IdempotencyConflict(ValueError):
    """Raised when an idempotency key is reused with a different request."""


@dataclass(frozen=True, slots=True)
class IdempotencyResult:
    value: Any
    replayed: bool
    key: str


@dataclass(slots=True)
class _CacheEntry:
    fingerprint: str
    value: Any
    stored_at: float


class IdempotencyStore:
    """Small async-safe replay-prevention cache.

    The logical key is combatId:actionId. If actionId is unavailable,
    the caller can use turn-N as the action identity. Same key + same
    payload returns the cached response. Same key + different payload
    raises IdempotencyConflict.
    """

    def __init__(
        self,
        *,
        ttl_seconds: float = 900.0,
        max_entries: int = 4096,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        if max_entries <= 0:
            raise ValueError("max_entries must be positive")

        self.ttl_seconds = float(ttl_seconds)
        self.max_entries = int(max_entries)
        self._cache: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._locks: dict[str, asyncio.Lock] = {}
        self._guard = asyncio.Lock()

    async def execute(
        self,
        *,
        key: str,
        request: Mapping[str, Any],
        producer: Callable[[], Awaitable[T]],
    ) -> IdempotencyResult:
        """Run producer once for a key and cache its successful result."""

        if not isinstance(key, str) or not key:
            raise ValueError("idempotency key must not be empty")

        fingerprint = self.fingerprint(request)
        lock = await self._lock_for(key)

        async with lock:
            now = time.monotonic()
            await self._prune(now)

            entry = self._cache.get(key)
            if entry is not None:
                if entry.fingerprint != fingerprint:
                    raise IdempotencyConflict(
                        f"idempotency key {key!r} was already used with a different payload"
                    )

                self._cache.move_to_end(key)
                return IdempotencyResult(
                    value=copy.deepcopy(entry.value),
                    replayed=True,
                    key=key,
                )

            value = await producer()

            async with self._guard:
                self._cache[key] = _CacheEntry(
                    fingerprint=fingerprint,
                    value=copy.deepcopy(value),
                    stored_at=time.monotonic(),
                )
                self._cache.move_to_end(key)
                self._trim_locked()

            return IdempotencyResult(
                value=copy.deepcopy(value),
                replayed=False,
                key=key,
            )

    async def _lock_for(self, key: str) -> asyncio.Lock:
        async with self._guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[key] = lock
            return lock

    async def _prune(self, now: float) -> None:
        async with self._guard:
            expired = [
                key
                for key, entry in self._cache.items()
                if now - entry.stored_at >= self.ttl_seconds
            ]
            for key in expired:
                self._cache.pop(key, None)

            stale_locks = [
                key
                for key, lock in self._locks.items()
                if key not in self._cache and not lock.locked()
            ]
            for key in stale_locks:
                self._locks.pop(key, None)

            self._trim_locked()

    def _trim_locked(self) -> None:
        while len(self._cache) > self.max_entries:
            key, _ = self._cache.popitem(last=False)
            lock = self._locks.get(key)
            if lock is not None and not lock.locked():
                self._locks.pop(key, None)

    @staticmethod
    def fingerprint(request: Mapping[str, Any]) -> str:
        try:
            canonical = json.dumps(
                request,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            )
        except (TypeError, ValueError) as exc:
            raise ValueError("request must be JSON-serializable") from exc

        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    @staticmethod
    def action_identity(
        combat_id: Any,
        action_id: Any = None,
        turn: Any = None,
    ) -> str:
        if not isinstance(combat_id, str) or not combat_id.strip():
            raise ValueError("combat_id must be a non-empty string")

        normalized_action_id: str | None = None
        if isinstance(action_id, str) and action_id.strip():
            normalized_action_id = action_id.strip()

        if normalized_action_id is None and isinstance(turn, int) and not isinstance(turn, bool):
            if turn > 0:
                normalized_action_id = f"turn-{turn}"

        if normalized_action_id is None:
            raise ValueError(
                "action identity requires action_id or positive turn"
            )

        return f"{combat_id.strip()}:{normalized_action_id}"
