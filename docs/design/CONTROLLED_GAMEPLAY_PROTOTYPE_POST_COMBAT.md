# Controlled Gameplay Prototype — Post-Combat Progression Bridge

## Status

**[PROTOTYPE] IMPLEMENTED**

**Base:** `eeb89ce16cec58c2a2ec8e1fba1c23cb4841e8b2`

This phase prototypes exactly one gameplay gap: the bridge from combat result/reward to a persistent progression choice and the next combat objective.

## Chosen progression design

The prototype modifies one progression dimension only: **persistent attack-card damage bonus**.

After a victory reward is claimed, the player chooses one of two existing attack cards:
- **DISPARO NEÓN +5**
- **EMBESTIDA NITRO +5**

The `+5` amount is explicitly a **[PROTOTYPE VALUE]**. It is not a final balance decision.

Both choices affect the same dimension: persistent damage bonus on one existing attack card. No new currency, card collection, deck editor, Garage, equipment, skill tree or economy was introduced.

## Player flow

`COMBAT → RESULT → REWARD → PROGRESSION CHOICE → SAVE → NEXT OBJECTIVE → NEXT COMBAT`

The reward remains the existing XP/currency reward. The progression choice is stored inside the existing `bosozoku_player_save` structure.

The next combat reads the saved progression and applies the selected card-damage bonus to the existing card definition at combat runtime.

## Persistence

No second save is created.

The existing `SaveManager` and `localStorage` key `bosozoku_player_save` remain the persistence mechanism. Browser Web Storage provides origin-scoped localStorage that persists across page loads and browser restarts, subject to normal browser storage policies.

A pending progression decision is also stored so a reload between reward and confirmation does not silently discard the choice opportunity.

## Telemetry

New events:
- `progression_viewed`
- `progression_selected`
- `progression_saved`
- `next_objective_viewed`

They use the existing versioned telemetry envelope. No retention metrics are fabricated.

## Scope integrity

Not implemented:
- Nitro
- Redline
- Phase 14–16 evidence changes
- Garage
- full deckbuilding
- economy rework
- new modes
- story
- relationships
- art assets
- wardrobe
- camera/POV
- monetization

## Validation boundary

The prototype is a functional product-system experiment, not evidence of player preference, retention, fun, balance, or long-term viability.

A later phase should conduct controlled gameplay validation/human playtesting before treating the progression choice or `+5` value as product decisions.
