# 2026-10-02 — Phase 29-E camera observability follow-up

## Evidence

Camera interpolation is now mathematically correct and fully tested. A browser execution on the exact current branch still did not make camera movement visually verifiable.

## Architectural hypothesis

The current presentation path should be checked for a coordinate-space mismatch:

- Shot Director entity anchors are normalized to viewport coordinates.
- Those values are being stored on scene actors and then passed through the camera/world-to-screen renderer pipeline.
- Background/foreground drawing also occurs inside the camera transform.

The next task should therefore verify the contract:

```
WORLD SPACE
→ CAMERA
→ SCREEN SPACE
```

and determine whether any actor/background content is already screen-positioned before the camera is applied.

Do not change gameplay and do not create another camera.

## Next task

Create a small camera-only observability task:

1. audit world-space versus screen-space inputs;
2. add source-level regression for actual screen displacement caused by camera movement;
3. correct the coordinate contract minimally if required;
4. perform exactly one browser observation on the exact updated HEAD;
5. stop and report.

