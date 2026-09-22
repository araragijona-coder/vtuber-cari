# Bitácora — Scavenger Protocol

## 2026-09-22

### IMPLEMENTADO
- Created dependency-free combat module with defense, critical chance, variance and damage types.
- Created initiative-based dynamic turn scheduler.
- Created pointer/touch target selection with circular hit testing and nearest-target resolution.
- Created bounded particle pool for impact effects.
- Created public module barrel export.
- Added deterministic Node smoke test.
- Added local ESM package metadata.
- Added provenance/attribution documentation.

### VERIFICADO
- Smoke test covers deterministic damage.
- Smoke test covers critical damage.
- Smoke test covers initiative ordering.
- Smoke test covers touch/click hit testing.
- Smoke test covers particle capacity and expiration.

### NO REPETIR
- Do not reimplement these four mechanics unless a concrete bug or new requirement is found.
- Do not add React/Vue/Three.js/physics frameworks to this layer.
- Do not copy third-party source verbatim.
- Do not add Windows capture, native audio, OBS or VTuber rendering here; those belong to the separate streaming project.

### PENDIENTE
- Wire combat events into the Telegram Mini App UI.
- Add authoritative server-side validation for multiplayer/progression.
- Add status effects and elemental resistances only if the game design requires them.
- Add visual particle presets and pooling benchmarks in the actual Mini App.
