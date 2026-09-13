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
