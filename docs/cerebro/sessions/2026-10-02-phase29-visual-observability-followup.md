# 2026-10-02 — Phase 29 visual observability follow-up

## Status

CURRENT DESIGN / DIAGNOSTIC DECISION

## Evidence

Phase 29-D closed without browser visual verification of:

- motorcycle;
- camera movement;
- attack movement;
- impact.

The browser did verify rendering, the cinematic trigger, and absence of an observed JavaScript exception.

## Code-level finding

Inspection of the current `mach-girls-2.5d` camera implementation identified a concrete weakness in `js/scene/camera.js`:

```
update()
→ computes total transition progress
→ applies that progress incrementally to the CURRENT state
```

instead of storing the transition's starting camera state and interpolating:

```
START STATE
→ interpolation(t)
→ TARGET STATE
```

This can make transitions visually compressed or behave unlike a true deterministic camera interpolation.

The existing Shot Director already defines explicit shot targets and durations, so the next work should correct the camera interpolation foundation rather than adding more arbitrary waiting or repeating browser sessions.

## Next task

Create a small follow-up task dedicated to:

1. correct camera interpolation using a captured start state;
2. add source-level regression tests for start/mid/end transition states;
3. preserve existing Shot Director and camera APIs;
4. make no gameplay changes;
5. perform one browser observation on the exact updated branch HEAD;
6. separately classify motorcycle/attack/impact visual evidence.

## Guardrails

Do not repeat Phase 29-D.

Do not create a second camera.

Do not create a second renderer.

Do not change gameplay.

Do not add new roster members.

Final character art remains human approval gated.

