# Phase 18 — Combat Model Pivot & Semi-Real-Time Vertical Slice

> Authoritative design derived from the 2026-10-01 Rocket Bunny Petty Master Recovery / Design Pivot Update.

## Goal

Replace the production turn-based interaction model with a low-cost, deterministic semi-real-time combat loop where characters auto-attack continuously and the player intervenes through energy-gated skill cards.

## Runtime model

Production combat uses a fixed logical step of 100 ms (10 ticks/second). Rendering is cosmetic and consumes simulation state; render FPS must not determine gameplay outcomes.

The runtime keeps the existing GameState, CombatEngine/combat modules, CardSystem, StatusSystem, enemy catalog, RNG, SaveManager, progression, telemetry, Canvas, DOM/CSS, and GitHub Pages surface. Phase 17A remains valid as a technically validated prototype but is no longer the production interaction model.

A new RealtimeCombat simulation boundary owns time progression, auto-attacks, telegraphs, skill inputs, cooldowns, Energy, BREAK, BURST, statuses, and deterministic replay state.

## Combat state

The semi-real-time combat state must expose:

- mode = SEMI_REALTIME
- simulationTick
- player.autoAttack
- enemy.autoAttack
- resources.currentEnergy
- resources.maxEnergy
- resources.energyRegen
- resources.burstCharge
- resources.burstMax
- cooldowns.cards
- player.block and player.blockDurationTicks
- enemy.breakCurrent
- enemy.breakMax
- enemy.breakState
- enemyIntent with type, value, startedTick, resolveTick, remainingTicks, and label
- inputLog
- outcome

Compatibility aliases resources.energy and resources.maxEnergy remain synchronized for existing consumers.

## Prototype balance

These values are explicitly [PROTOTYPE BALANCE]:

- tickMs = 100
- energyMax = 100
- energyStart = 35
- energyRegenPerTick = 2
- player auto attack every 12 ticks for 8 damage and 3 BREAK
- enemy intent lead time = 12 ticks
- enemy attack cycle = 24 ticks after resolution
- temporary block duration = 12 ticks
- BREAK max = 60
- BREAK state duration = 20 ticks
- BURST max = 100
- BURST passive gain = 1 per tick
- BURST gains additional charge from player skills and incoming damage

Balance remains subject to human playtest revision.

## Skill/card behavior

The existing nine card identities remain recognizable and become skills usable during continuous simulation.

- DISPARO NEÓN: attack damage.
- EMBESTIDA NITRO: higher attack and BREAK.
- DERRAPE EXPUESTO: conditional bonus while EXPOSED.
- ESCUDO DARK: temporary BLOCK.
- BARRICADA NEÓN: stronger BLOCK plus Energy.
- ESPEJO URBANO: BLOCK plus EXPOSED.
- LECTURA TÁCTICA: draw cards.
- SOBRECARGA: Energy recovery.
- PULSO DEBILITANTE: WEAK on the enemy.

Cards consume Energy immediately and do not require a player turn or END TURN. Each card has a small cooldown contract so recycling does not produce unlimited same-card bursts.

The opening hand is five cards and deliberately contains ATTACK, DEFENSE, and SKILL roles.

## Enemy timing

Enemies continuously schedule telegraphed intents. The telegraph must be actionable and readable.

Minimum intent types:

- ATTACK
- DEFEND
- DEBUFF

Each intent has a deterministic lead delay. A resolved intent enters cooldown before another intent is scheduled.

Existing enemy archetypes map onto this temporal model without introducing Nitro or Redline.

## Defense and statuses

BLOCK is real mitigation and expires by ticks.

WEAK reduces outgoing damage while its durationTicks is active.

EXPOSED increases received damage while its durationTicks is active.

No status UI is authoritative; simulation state is the source of truth.

## BREAK

BREAK is a secondary enemy gauge independent from HP.

Skill and auto-attack effects may add BREAK damage. When BREAK reaches zero:

- breakState.active = true
- enemy intent resolution is suspended
- incoming damage receives a prototype vulnerability multiplier
- the state lasts for a fixed tick duration
- BREAK resets deterministically after the window ends

## BURST

BURST is a single higher-level resource.

It charges through normal combat, can be activated when full, deals meaningful damage and BREAK, and gains extra payoff when the enemy is currently BROKEN. It is not a global Nitro system and does not implement Redline.

## Active ability

PULSO BŌSŌZOKU remains a one-use character ability.

In semi-real-time mode it is evaluated against live Energy and simulation state, never against END TURN.

## Determinism

Gameplay cannot call Math.random().

A replay is defined by:

- seed
- ordered player input events with logical ticks

The same seed and input sequence must produce the same simulation snapshot independent of render cadence.

## Persistence and telemetry

SaveManager remains saveVersion = 1 with no migration unless an existing field genuinely requires it.

Telemetry adds only useful events:

- skill_used
- energy_spent
- enemy_telegraph
- enemy_attack_resolved
- break_started
- break_ended
- burst_used

No backend is introduced.

## UI

Production UI removes END TURN.

The HUD exposes:

- HP
- BLOCK
- Energy as a granular current / max
- BREAK gauge
- BURST gauge
- enemy telegraph with remaining time
- statuses with remaining duration
- compact five-card hand
- BURST and ABILITY controls

Canvas presentation communicates automatic fighting through low-cost motion, flashes, hit feedback, and telegraph emphasis. Visual polish is secondary to readable gameplay state.

## Acceptance gate

Phase 18 is not considered product-valid merely because unit tests pass.

Required evidence is separated into:

- unit/integration tests
- remote CI
- browser QA
- human playtest

The human playtest is the final sensation gate for the pivot.
