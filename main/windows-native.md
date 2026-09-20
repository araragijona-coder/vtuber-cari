# Cari Studio — Windows native contract

Cari Studio is a Windows-first desktop application. The core must work without an AI model, cloud API, or network connection except when the user explicitly starts an online service such as streaming or chat.

## Native multimedia stack

Prefer Windows-native primitives instead of a generic cross-platform abstraction for the hot path:

- **Screen/window capture:** `Windows.Graphics.Capture` for display and application-window capture.
- **Audio:** WASAPI/Core Audio for low-latency device and application audio paths.
- **Camera/media devices:** Media Foundation capture sources.
- **Video/audio pipeline and encoding:** Media Foundation where it fits the required codec/output path.
- **Rendering/composition:** Direct3D 11/Direct2D or a thin native renderer layer.

These choices are intentional: the product is optimized for Windows, not designed as a lowest-common-denominator cross-platform app.

## Offline rule

The following must remain usable with Wi-Fi disconnected:

- application startup;
- scenes and layouts;
- screen/window preview;
- local camera preview;
- local audio mixer and meters;
- local voice effects that have been installed;
- VTuber rendering and expressions;
- local configuration and profiles;
- performance/health dashboard.

Internet is required only for features that inherently communicate externally, such as live streaming and online chat/event providers.

## AI/API rule

No AI provider is part of the startup path. No OpenAI/Gemini/Ollama/API key may be required to launch Cari Studio.

Any future AI integration must be an optional plugin/service boundary and must never replace the deterministic local control path.

## Resource budget

The application should expose simple health values while retaining raw measurements:

- CPU;
- GPU;
- RAM;
- render FPS/frame time;
- capture FPS/drop count;
- audio buffer health/latency;
- encoder load/latency;
- network bitrate and dropped frames while streaming.

The dashboard must explain a problem in plain language instead of exposing only technical counters.

## Architecture rule

```text
Windows capture/audio/media
            ↓
       native pipeline
            ↓
      scene compositor
            ↓
  ┌─────────┼─────────┐
  ↓         ↓         ↓
preview   recorder   streamer
            ↓
       creator UI
```

OBS is a reference for the category, not an implementation dependency. Cari Studio must not embed OBS and must not require OBS to render or stream.
