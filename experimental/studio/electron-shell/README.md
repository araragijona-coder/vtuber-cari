# Cari Studio Electron Shell

This directory is intentionally **experimental**. It is a control/UI layer around the native Windows media engine; it does not replace the native capture/audio pipeline.

## Architecture

```
Electron UI
  ├─ AvatarActingBridge
  ├─ Three.js renderer
  ├─ optional MediaPipe FaceLandmarker
  └─ optional OBS WebSocket adapter
          │
          │ local IPC / stdin JSON commands
          ▼
Native Windows engine
  ├─ Windows Graphics Capture
  ├─ WASAPI
  ├─ FrameBridge
  ├─ AudioTimelineMixer
  ├─ Software compositor
  └─ FFmpeg A/V output
```

The design deliberately separates:

- **Capture:** native Windows implementation.
- **Audio:** WASAPI + timeline mixer.
- **Composition:** native compositor.
- **Avatar:** browser/WebGL renderer.
- **Tracking:** MediaPipe adapter.
- **OBS:** optional local WebSocket integration.
- **Control:** Electron IPC plus a line-oriented JSON command contract.

No cloud API is required for the control plane.

## Asset contracts

- Three.js accepts glTF/GLB avatar assets.
- Live2D remains a separate adapter because its runtime/SDK licensing and distribution terms must be respected.
- MediaPipe requires a compatible local model asset; the model is not bundled here.
- VTuber image placeholders can be represented as ordinary scene assets before a full avatar renderer is integrated.

## Important status

This shell is not promoted to production yet. The native executable must expose the JSON command contract before the UI can control capture/output for real. Until that integration is implemented and hardware-tested, this entire directory remains experimental.
