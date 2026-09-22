from __future__ import annotations

import inspect
import json
from collections.abc import Awaitable, Callable, Mapping
from typing import Any

from aiohttp import web

from .combat_validator import CombatValidationError
from .idempotency import IdempotencyConflict
from .service import TmaCombatService


VerifyTelegramInitData = Callable[[str], Any]
GetGameContext = Callable[[Any], Awaitable[Mapping[str, Any]] | Mapping[str, Any]]


async def _maybe_await(value: Any) -> Any:
    if inspect.isawaitable(value):
        return await value
    return value


def _extract_player_id(
    verified: Any,
    extractor: Callable[[Any], Any] | None,
) -> Any:
    if extractor is not None:
        player_id = extractor(verified)
        if player_id is not None:
            return player_id

    if isinstance(verified, Mapping):
        for key in ("user_id", "userId", "id"):
            value = verified.get(key)
            if value is not None:
                return value

        user = verified.get("user")
        if isinstance(user, Mapping):
            for key in ("id", "user_id", "userId"):
                value = user.get(key)
                if value is not None:
                    return value

    return None


def create_combat_routes(
    *,
    service: TmaCombatService,
    verify_telegram_init_data: VerifyTelegramInitData,
    get_game_context: GetGameContext,
    player_id_extractor: Callable[[Any], Any] | None = None,
) -> list[web.RouteDef]:
    """Build the aiohttp route set for the authoritative combat endpoint."""

    async def combat_action(request: web.Request) -> web.Response:
        init_data = request.headers.get("X-Telegram-Init-Data")
        if not init_data:
            return web.json_response(
                {"ok": False, "error": "missing_telegram_init_data"},
                status=401,
            )

        try:
            verified = await _maybe_await(verify_telegram_init_data(init_data))
        except (ValueError, KeyError):
            return web.json_response(
                {"ok": False, "error": "invalid_telegram_init_data"},
                status=401,
            )

        if not verified:
            return web.json_response(
                {"ok": False, "error": "invalid_telegram_init_data"},
                status=401,
            )

        player_id = _extract_player_id(verified, player_id_extractor)
        if player_id is None:
            return web.json_response(
                {"ok": False, "error": "telegram_identity_missing"},
                status=401,
            )

        try:
            payload = await request.json(loads=json.loads)
        except (json.JSONDecodeError, ValueError, TypeError):
            return web.json_response(
                {"ok": False, "error": "invalid_json"},
                status=400,
            )

        if not isinstance(payload, Mapping):
            return web.json_response(
                {"ok": False, "error": "json_body_must_be_object"},
                status=400,
            )

        try:
            context = await _maybe_await(get_game_context(player_id))
        except KeyError:
            return web.json_response(
                {"ok": False, "error": "game_context_not_found"},
                status=404,
            )

        if not isinstance(context, Mapping):
            return web.json_response(
                {"ok": False, "error": "invalid_game_context"},
                status=500,
            )

        required_context = ("authoritative_state", "profile", "base_xp", "base_coins")
        missing = [key for key in required_context if key not in context]
        if missing:
            return web.json_response(
                {"ok": False, "error": "game_context_incomplete", "missing": missing},
                status=500,
            )

        try:
            result = await service.process(
                payload,
                authoritative_state=context["authoritative_state"],
                profile=context["profile"],
                base_xp=context["base_xp"],
                base_coins=context["base_coins"],
                base_loot=context.get("base_loot"),
                now=context.get("now"),
            )
        except IdempotencyConflict:
            return web.json_response(
                {"ok": False, "error": "idempotency_conflict"},
                status=409,
            )
        except CombatValidationError as exc:
            return web.json_response(
                {"ok": False, "error": "combat_validation_failed", "detail": str(exc)},
                status=400,
            )
        except (ValueError, TypeError) as exc:
            return web.json_response(
                {"ok": False, "error": "invalid_combat_request", "detail": str(exc)},
                status=400,
            )
        except Exception:
            request.app.logger.exception("Unexpected combat action failure")
            return web.json_response(
                {"ok": False, "error": "internal_server_error"},
                status=500,
            )

        return web.json_response(result, status=200)

    return [web.post("/api/combat/action", combat_action)]