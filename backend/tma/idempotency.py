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
    """Small async-safe replay-prevention cache."""

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
        self._inflight: dict[str, asyncio.Future[Any]] = {}
        self._guard = asyncio.Lock()

    async def execute(
        self,
        *,
        key: str,
        request: Mapping[str, Any],
        producer: Callable[[], Awaitable[T]],
    ) -> IdempotencyResult:
        """Run producer once for a key and cache its successful result.

        Concurrent duplicates await the first execution instead of starting a
        second mutation. Failed executions are not cached, so a corrected
        request may retry with the same key.
        """

        if not isinstance(key, str) or not key:
            raise ValueError("idempotency key must not be empty")

        fingerprint = self.fingerprint(request)
        loop = asyncio.get_running_loop()

        async with self._guard:
            now = time.monotonic()
            self._prune_locked(now)

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

            future = self._inflight.get(key)
            if future is None:
                future = loop.create_future()
                self._inflight[key] = future
                owner = True
            else:
                owner = False

        if not owner:
            try:
                value = await future
            except Exception:
                raise
            return IdempotencyResult(
                value=copy.deepcopy(value),
                replayed=True,
                key=key,
            )

        try:
            value = await producer()
        except BaseException as exc:
            async with self._guard:
                self._inflight.pop(key, None)
                if not future.done():
                    future.set_exception(exc)
                    # Mark the exception as retrieved for the no-waiter case.
                    future.exception()
            raise

        async with self._guard:
            self._cache[key] = _CacheEntry(
                fingerprint=fingerprint,
                value=copy.deepcopy(value),
                stored_at=time.monotonic(),
            )
            self._cache.move_to_end(key)
            self._inflight.pop(key, None)
            self._trim_locked()

            if not future.done():
                future.set_result(copy.deepcopy(value))

        return IdempotencyResult(
            value=copy.deepcopy(value),
            replayed=False,
            key=key,
        )

    def _prune_locked(self, now: float) -> None:
        expired = [
            key
            for key, entry in self._cache.items()
            if now - entry.stored_at >= self.ttl_seconds
        ]
        for key in expired:
            self._cache.pop(key, None)

        self._trim_locked()

    def _trim_locked(self) -> None:
        while len(self._cache) > self.max_entries:
            self._cache.popitem(last=False)

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
