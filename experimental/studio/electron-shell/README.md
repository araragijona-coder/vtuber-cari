# Cari Studio Electron Shell

This directory is intentionally **experimental**. It is the desktop control/UI layer around the native Windows media engine. The architecture is local-first: Electron provides the control surface, the Windows runtime owns screen/window capture and WASAPI, and avatar tracking/rendering stays in the UI layer.

## Runtime architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Electron renderer                                               │
│                                                                 │
│  StudioController ── Native command requests                   │
│  AvatarActingBridge ← FaceTrackingBridge ← MediaPipe            │
│  ThreeAvatarRenderer ── GLB/glTF avatar                        │
│  local camera preview                                           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ contextBridge / IPC
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Electron main                                                   │
│                                                                 │
│  NativeEngine                                                   │
│    ├─ process lifecycle                                         │
│    ├─ stdout JSON response correlation                          │
│    ├─ stderr diagnostics                                        │
│    └─ graceful output.stop before process termination           │
└──────────────────────────────┬──────────────────────────────────┘
                               │ stdin/stdout JSONL
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Native Windows runtime                                          │
│                                                                 │
│  Windows Graphics Capture → FrameBridge → MediaGraph            │
│  WASAPI → AudioTimelineMixer ───────────────────────┐           │
│  software compositor (reference validation)         │           │
│  RawPipe → FFmpeg A/V output                        │           │
│                                                     ▼           │
│                                              local recording    │
└─────────────────────────────────────────────────────────────────┘
```

## Module responsibilities

### Capture

The native runtime owns screen/window capture through Windows Graphics Capture. This avoids putting the core desktop capture path inside the browser process and keeps device recovery and WinRT apartment requirements in one place.

### Audio

WASAPI capture and the native timeline mixer stay outside Electron. The UI can start/stop the bridge but does not manipulate device buffers directly.

### Avatar bridge

- `AvatarActingBridge` is the stable state model for expressions, mouth openness, blinking, head rotation and gaze.
- `FaceTracker` is the MediaPipe adapter.
- `FaceTrackingBridge` converts MediaPipe blendshapes/pose into avatar state.
- `ThreeAvatarRenderer` consumes that state and renders a glTF/GLB avatar.
- The renderer has a deliberately simple placeholder avatar so the UI remains testable without distributing a proprietary model.
- Live2D is a future adapter boundary; this repository does not bundle the Live2D runtime or SDK.

### Control plane

The native process accepts line-delimited JSON. Every Electron request receives a generated `id`, and native responses echo that id so concurrent UI actions cannot be confused.

Supported commands:

```json
{"type":"status","id":"..."}
{"type":"capture.start","source":"window","id":"..."}
{"type":"capture.stop","id":"..."}
{"type":"audio.start","id":"..."}
{"type":"audio.stop","id":"..."}
{"type":"output.start","profile":"local-record","id":"..."}
{"type":"output.stop","id":"..."}
```

The parser is intentionally tiny and deterministic; it is not a general JSON implementation. The protocol remains experimental until a full schema validator is justified and tested.

## Local configuration

The shell does not require cloud services. Optional local environment variables are:

- `CARI_NATIVE_EXECUTABLE`: absolute path to `cari-studio-native.exe`.
- `CARI_MEDIAPIPE_MODEL_PATH`: absolute path to a compatible MediaPipe Face Landmarker `.task` model.
- `CARI_AVATAR_MODEL_PATH`: absolute path to a local GLB/glTF-compatible avatar asset.

Example PowerShell session:

```powershell
$env:CARI_NATIVE_EXECUTABLE="C:\path\to\cari-studio-native.exe"
$env:CARI_MEDIAPIPE_MODEL_PATH="C:\path\to\face_landmarker.task"
$env:CARI_AVATAR_MODEL_PATH="C:\path\to\avatar.glb"
npm install
npm run check
npm start
```

## What is deliberately not production-ready

1. **A/V timestamp fidelity.** The native FFmpeg path currently transports raw video/audio bytes. It does not encode the original capture PTS into the subprocess protocol, so the current output timestamp strategy must not be described as preserving capture timestamps.
2. **Compositor output.** The software compositor is still a reference/diagnostic stage. The encoded video path currently receives the captured BGRA frame bridge directly.
3. **Live2D.** The architecture has an adapter boundary, but no Live2D runtime is bundled.
4. **Hardware validation.** Capture-device recovery, microphone permissions and FFmpeg execution still need validation on the target Windows machine.
5. **Protocol parser.** It is a small command recognizer, not a general JSON parser.

The directory remains `experimental/` until these gates are validated by CI and target-machine tests.
