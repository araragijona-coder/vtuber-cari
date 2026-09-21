# Cari V1 — Blender / VRM 1.0 Pipeline Specification

## Objective

Convert a real Cari FBX into an auditable VRM 1.0 package without coupling the authoring process to the streaming renderer.

## Pipeline stages

1. Import: Blender FBX operator with explicit axis/scale policy.
2. Audit: mesh count, vertices, polygons, UV layers, armature links, deform bones and empty meshes.
3. Cleanup: zero-weight repair, influence cap, normalization and mesh rotation/scale application.
4. Facial contract: stable cari_* shape-key namespace. Missing keys become explicit placeholders, never fake facial deformation.
5. Humanoid: map required VRM 1.0 human bones and report missing assignments as errors.
6. Materials: enable MToon 1 through the VRM Add-on API and set safe anime-style defaults.
7. Metadata: write VRM 1.0 metadata from configuration instead of hard-coding a release license decision.
8. Export: write .vrm only after audit errors are clear.
9. Reimport audit: load the exported VRM again and verify Armature, mesh and VRM 1.0 spec version.
10. Artifacts: staging .blend plus JSON report.

## Required humanoid bones

VRM 1.0 requires hips, spine, head, both upper/lower arms, hands, upper/lower legs and feet. Chest/neck/shoulders/toes are treated as optional in this pipeline.

## Cari facial namespace

| Cari parameter | Shape key | Runtime consumer |
|---|---|---|
| mouth.open | cari_mouth_open | FaceTrackingBridge / lip-sync |
| eye.blink.L | cari_blink_l | FaceTrackingBridge |
| eye.blink.R | cari_blink_r | FaceTrackingBridge |
| expression.happy | cari_happy | Action Store / avatar state |
| expression.angry | cari_angry | Action Store / avatar state |
| expression.sad | cari_sad | Action Store / avatar state |
| expression.surprised | cari_surprised | Action Store / avatar state |
| expression.embarrassed | cari_embarrassed | Action Store / avatar state |
| expression.sleepy | cari_sleepy | Action Store / avatar state |
| expression.talking | cari_talking | local speech/lip-sync |

## Weight repair policy

- Zero-influence vertices are assigned to the nearest deform bone as a deterministic fallback.
- Deform influences are capped at four by default.
- Remaining influences are normalized to one.
- The report records how many vertices were touched.
- This is an automatic safety pass, not a replacement for artist weight painting.

## License safety

The exported VRM metadata uses a staging-safe configuration. The final author must set the real license/redistribution permissions before production. The repository never vendors Cubism Core or the VRM Add-on runtime.

## Evidence states

- SPEC_ONLY: art contract exists.
- CODE_EXISTS: pipeline script/config exist.
- CONTRACT_VERIFIED: syntax/config contract passes CI when runners are observable.
- WINDOWS_VERIFIED: Blender execution/export/reimport verified on Windows.
- HARDWARE_VALIDATED: loaded and tracked in the target streaming environment.
- PRODUCTION_VALIDATED: long-session, render, tracking, lip-sync, performance and licensing gates are all closed.

## Failure policy

The pipeline stops export on audit errors. It does not silently fabricate an Armature, missing required bones, or real facial deltas.

## Integration

Blender -> VRM/GLB -> ThreeAvatarRenderer -> FaceTrackingBridge -> existing Cari compositor/output path.

The VRM model is an asset, not a new runtime. The existing acting contract remains the source of truth.
## Expression bindings

Cuando existe el VRM Add-on, el pipeline enlaza automáticamente los shape keys cari_* con expresiones VRM 1.0:
- `aa` ← `cari_mouth_open`
- `blink_left` ← `cari_blink_l`
- `blink_right` ← `cari_blink_r`
- `happy` ← `cari_happy`
- `angry` ← `cari_angry`
- `sad` ← `cari_sad`
- `surprised` ← `cari_surprised`
- `relaxed` ← `cari_sleepy`
- custom `cari_embarrassed`
- custom `cari_talking`

Los shape keys creados por el pipeline siguen marcados como PLACEHOLDER; el binding existe para que el rigging posterior no tenga que rehacer la integración VRM.