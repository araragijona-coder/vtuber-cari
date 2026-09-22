# Scavenged mechanics

Dependency-free JavaScript modules for the Telegram Mini App game layer.

Modules:
- combat.js: damage, defense, critical hits and attack resolution.
- turn-system.js: initiative-based dynamic turns.
- target-selection.js: mouse/touch target hit-testing.
- particles.js: bounded impact particle pool.
- index.js: public module surface.
- scavenged-smoke.mjs: Node smoke test.

Constraints:
- Vanilla ECMAScript modules.
- No React, Vue, Three.js, Canvas framework, physics engine, or runtime dependency.
- Simulation is independent from rendering.
- Bounded particle memory.
- Injectable RNG for deterministic tests.

Provenance:
These implementations are original clean-room code informed by public patterns from MIT-licensed projects:
- ericmaddox/html-dungeon-crawl: turn-based combat and dependency-free Canvas architecture.
- mar10/arcade-js: Canvas loop, input and hit-testing patterns.
- Haseeb-Qureshi/Asteroids: vanilla Canvas arcade and particle patterns.

No source file is copied verbatim. Direct reuse from third-party repositories is intentionally avoided unless its license is verified and attribution requirements are preserved.
