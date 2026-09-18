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

The native executable now exposes a small line-oriented JSON command contract on stdin/stdout. Supported commands are:

- {"type":"status"}
- {"type":"capture.start","source":"window"}
- {"type":"capture.stop"}
- {"type":"audio.start"}
- {"type":"audio.stop"}
- {"type":"output.start","profile":"local-record"}
- {"type":"output.stop"}

The Electron shell sends these commands through the child process stdin. The native runtime reads stdin on a worker thread and posts commands onto its Win32 UI thread, keeping Windows Graphics Capture control on the apartment thread.

The shell is still not promoted to production: the local A/V path remains experimental, timestamp fidelity between raw pipes is not yet a capture-PTS contract, the compositor is currently a reference validation stage rather than the encoded video source, and hardware/FFmpeg integration tests are still required. Until those gates pass, this entire directory remains experimental.
