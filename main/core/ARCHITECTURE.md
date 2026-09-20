# Cari Core architecture

Cari Core is the local media spine of the application. It follows a proven separation of responsibilities found in mature creator software, while remaining an independent implementation rather than copied OBS code.

## Flow

```text
Native / local sources
        |
        v
   SourceRegistry
        |
        v
 timestamped frames/audio
        |
        +----> bounded queues ----+
        |                          |
        v                          v
      Scene                     AudioMixer
        |                          |
        +-----------+--------------+
                    |
                    v
               Composer
                    |
                    v
             EncoderBoundary
                    |
          +---------+---------+
          |                   |
          v                   v
      Recorder            Stream outputs
```

## Boundaries

- **Source**: owns device/platform-specific capture. Windows Graphics Capture, WASAPI, camera and game capture remain replaceable adapters.
- **Queue**: absorbs bursts and makes drops measurable instead of hiding backpressure.
- **Scene**: describes ordered, visible sources without owning capture implementation.
- **AudioMixer**: applies mute/volume and produces a bounded mixed buffer. Real WASAPI devices plug in later.
- **EncoderBoundary**: isolates the chosen encoder (hardware H.264/HEVC/AV1, software fallback, or an external multimedia library).
- **Output**: isolates recording/streaming protocols from the local engine.
- **Monitoring**: reports simple health levels for the creator UI.

## Why this shape

OBS exposes sources that can provide video/audio and supports timestamped asynchronous video output; its video subsystem and outputs are separate concerns. Streamlabs likewise keeps a services/backend layer behind a UI boundary. Cari adopts the useful separation without adopting their code or product scope.

## Current status

Implemented contracts and smoke coverage:

- source registration
- timestamped frame/audio contracts
- bounded video/audio queues
- ordered scenes
- local audio mixer model
- encoder boundary
- output boundary
- runtime health classification
- native Windows smoke executable

Not yet production-complete:

- actual pixel texture composition
- GPU compositor
- real audio device streaming into the mixer
- hardware encoder integration
- recorder/muxer
- platform streaming adapters
- camera and game capture adapters
- real VTuber render integration

Those components should attach to these boundaries instead of redesigning the core pipeline.


## 2026-09 — Continuity ledger

### Completed / do not repeat
- IMPLEMENTED: Windows Graphics Capture for primary display and indexed windows.
- IMPLEMENTED: D3D11 capture path with resize/recreate and device-loss recovery.
- IMPLEMENTED: WASAPI microphone + system loopback capture.
- IMPLEMENTED: microphone-only anime-bright voice effect; this is not pitch/formant synthesis.
- IMPLEMENTED: audio timeline mixer and bounded queues.
- IMPLEMENTED: MediaClock with canonical signed 100-ns media timestamps.
- IMPLEMENTED: RealtimePacer anchored to monotonic wall time.
- IMPLEMENTED: global audio/video PTS interleaving with bounded per-poll work.
- IMPLEMENTED: raw named-pipe boundary to supervised FFmpeg.
- IMPLEMENTED: local recording and RTMP output profiles.
- IMPLEMENTED: output status, exit-code, queue/drop/cadence diagnostics.
- IMPLEMENTED: guarded RTMP retry policy with exponential backoff and network-only retry classification.
- IMPLEMENTED: Electron preload/context isolation and local renderer permission boundary.
- IMPLEMENTED: MediaPipe Face Landmarker adapter with monotonic timestamp guard.
- IMPLEMENTED: avatar contract + Three.js/glTF renderer with placeholder assets.
- IMPLEMENTED: optional OBS WebSocket control; OBS is not a runtime dependency for native output.
- VERIFIED: portable C++ smoke tests for timing, protocol, queue, retry and diagnostics contracts.
- VERIFIED: FFmpeg codec/mux contract using synthetic BGRA + PCM input and ffprobe.
- NOT VERIFIED IN TARGET HARDWARE: sustained Windows capture -> named pipes -> FFmpeg -> file/RTMP.

### Explicitly not complete
- PENDING: transport of original capture PTS through raw pipes; current pacing is not timestamp preservation.
- PENDING: GPU-native compositor path and avatar compositing into the final encoded frame.
- PENDING: camera Media Foundation source and Game Capture.
- PENDING: physical clock drift correction and long-duration A/V sync validation.
- PENDING: sustained real FFmpeg output on target Windows hardware.
- PENDING: RTMP reconnection validation against a real endpoint.
- PENDING: structured reconnect/backoff integration testing.
- PENDING: final avatar/Live2D runtime adapter and native lip-sync.
- PENDING: multistream.
- PENDING: installer, bundled/runtime FFmpeg distribution and release diagnostics.

### Do-not-repeat decisions
1. Do not replace native Windows Graphics Capture with OpenCV for desktop/window capture; OpenCV can remain an optional camera preprocessing dependency.
2. Do not make OBS a core dependency; the native engine owns capture/audio/output.
3. Do not claim A/V sync is production-ready while raw transport drops original PTS.
4. Do not call Three.js rendering equivalent to native compositor integration.
5. Do not retry encoder, muxer, permission or input failures as network failures.
6. Do not mark CI green when a runner reports steps=null or no executable job logs.
7. Keep unverified integrations under experimental/ until target validation passes.

### Current next-work order
1. Validate/fix the Windows build and smoke-test CI execution.
2. Add explicit end-to-end media timestamp transport or document a bounded synthetic PTS policy.
3. Implement GPU-native avatar compositor bridge.
4. Validate sustained local recording with real Windows capture/audio.
5. Validate RTMP reconnect against a controlled endpoint.
6. Add camera/Game Capture.
7. Add long-run drift correction and lip-sync.
8. Add multistream only after single-output stability.
