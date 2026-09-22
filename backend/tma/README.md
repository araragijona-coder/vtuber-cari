# TmaCombatService — autoridad de servidor e idempotencia

Estos módulos están aislados del Studio actual y usan únicamente la biblioteca estándar de Python. TmaCombatService es async, por lo que puede invocarse directamente desde una ruta aiohttp sin que el núcleo TMA dependa de aiohttp.

## Flujo

    Mini App
       |
       | backendPayload
       v
    TmaCombatService
       |
       +--> IdempotencyStore
       |       combatId:actionId
       |
       +--> CombatValidator
       |       usa authoritative_state
       |       recalcula daño / HP / outcome
       |
       +--> si outcome == VICTORY
               |
               v
           apply_victory_rewards

El cliente puede enviar state y resolution, pero el backend no los considera fuente de verdad. attack, HP inicial, turno, objetivo, seed y reglas de daño deben proceder de authoritative_state.

## Estado autoritativo mínimo

    authoritative_state = {
        "combatId": "combat-001",
        "turn": 1,
        "seed": "server-seed-001",
        "allowed_action_types": ["basic_attack", "critical_attack"],
        "attacker": {
            "id": "player-1",
            "attack": 40,
            "hp": 100,
            "max_hp": 100,
        },
        "target": {
            "id": "enemy-1",
            "hp": 80,
            "max_hp": 80,
        },
        "enemies_remaining": 1,
    }

El seed del cliente solo se acepta cuando coincide con el seed que ya posee el servidor. En producción ese valor debe nacer en el servidor y almacenarse junto al combate.

## backendPayload esperado

    {
        "combatId": "combat-001",
        "state": {
            "turn": 1
        },
        "action": {
            "actionId": "action-001",
            "type": "basic_attack",
            "attackerId": "player-1",
            "targetId": "enemy-1",
            "turn": 1
        },
        "resolution": {
            "damage": 42,
            "targetHpBefore": 80,
            "targetHpAfter": 38,
            "isCritical": false,
            "variance": 2,
            "outcome": "IN_PROGRESS"
        },
        "seed": "server-seed-001"
    }

Para critical_attack el multiplicador es 1.5; para basic_attack es 1.0. En ambos casos la varianza la calcula el backend de forma determinista a partir de seed + combatId + turn + actionId.

## Idempotencia

Los duplicados con el mismo combatId:actionId esperan la primera ejecución y luego reciben el mismo estado cacheado. Si se reutiliza esa clave con un payload diferente, el backend lanza IdempotencyConflict en lugar de aceptar una segunda mutación.

La caché tiene TTL de 15 minutos y un límite de 4096 entradas. Estos valores son configurables.

## Racha UTC

- Primera victoria: daily_streak = 1.
- Misma fecha UTC: no aumenta la racha y otorga XP/monedas y loot base.
- Fecha UTC inmediatamente siguiente: daily_streak += 1 y XP/monedas usan el multiplicador configurable de DailyRewardConfig; el valor por defecto es 2x.
- Más de 48 horas: daily_streak = 1.
- Un salto de calendario mayor de un día aunque todavía no supere 48 horas cae en RESET_CALENDAR_GAP.

Los valores de loot, XP y monedas son server-owned. No deben salir del cliente.

## Uso desde aiohttp

    async def combat_handler(request):
        payload = await request.json()

        result = await service.process(
            payload,
            authoritative_state=server_combat_state,
            profile=game_profile,
            base_xp=100,
            base_coins=25,
            base_loot=[{"itemId": "potion", "qty": 1}],
        )

        return web.json_response(result)

La capa aiohttp debe añadir autenticación del jugador, cargar el authoritative_state correcto y traducir excepciones a códigos HTTP. El núcleo TMA no importa aiohttp.

## Persistencia

IdempotencyStore es memoria local. Para un único proceso es suficiente para proteger contra reintentos concurrentes y lag. En varios workers o varias instancias, la clave debe moverse a un almacén compartido o a un mecanismo transaccional de unicidad antes de considerar la protección distribuida como completa.
