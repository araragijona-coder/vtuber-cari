# Cari Studio — arquitectura técnica

## Objetivo

Cari Studio es una herramienta Windows-first de streaming y VTubing con operación local. La interfaz Electron es el **control plane**; la captura de pantalla/ventana, WASAPI, transporte multimedia y FFmpeg pertenecen al motor nativo C++.

No se requiere IA para operar el programa. Las funciones principales no dependen de un servicio cloud.

## Capas

```
Electron Renderer
  UI · escenas · controles · avatar · tracking · métricas
        │ contextBridge / IPC
        ▼
Electron Main
  NativeEngine · lifecycle · request/response · eventos
        │
        ▼
StudioSessionManager
  serialización · rollback · estado de sesión
        │ stdin/stdout JSONL
        ▼
Native Windows Engine (C++)
  Windows Graphics Capture
  ├── window capture
  └── primary display capture
  WASAPI microphone + system loopback
  local voice DSP
  AudioTimelineMixer
  FrameBridge
  RealtimePacer → global PTS interleaver → paced raw emission
  MediaGraphController
  RawPipe
  FFmpeg A/V output
        │
        ├── local recording (graceful EOF/flush on stop)
        └── direct RTMP/RTMPS
```

## Captura y audio

El motor nativo es la fuente de verdad para:

- captura de ventana y pantalla primaria;
- audio WASAPI;
- mezcla y timeline de audio;
- recuperación del dispositivo de captura;
- ciclo de vida del media graph;
- transporte hacia FFmpeg.

La UI no escribe frames ni buffers de audio directamente.

## Voice processing

The microphone enters a deterministic local DSP stage before the timeline mixer:

```
WASAPI microphone
      ↓
VoiceEffectProcessor
      ↓
AudioTimelineMixer
      ↓
FFmpeg
```

The first built-in profile is `anime-bright`. It changes tone/dynamics locally without changing sample rate, channel count or duration. This is a voice-effect stage, not a pitch/formant engine.

## Privacidad y actuación local

La cámara del renderer es únicamente una superficie de entrada para tracking. El vídeo bruto no se presenta en Preview/Tracking: los elementos `video` quedan ocultos y el output nativo no consume ese bitmap.

La actuación se compone desde tres fuentes separadas:

```
Face Landmarker ──┐
                  ├─→ AvatarActingBridge → Renderer
Local VAD/LipSync ┤
                  │
ActivityController┘
```

El VAD indica actividad de voz probable por energía/histéresis; no es reconocimiento semántico del habla. Las actividades `idle`, `keyboard`, `controller` y `phone` son estados procedurales/manuales y no presuponen que la cámara haya reconocido el objeto físico.
 
## Avatar y tracking

El avatar permanece desacoplado del motor multimedia:

- `avatar/face-tracker.js`: adaptador local de MediaPipe Face Landmarker.
- `avatar/face-tracking-bridge.js`: convierte blendshapes/pose en estado de actuación.
- `avatar/acting-bridge.js`: estado neutral consumido por cualquier renderer.
- `avatar/three-avatar.js`: renderer WebGL con Three.js y assets glTF/GLB.
- `runtime/session-manager.js`: orquestador de la sesión multimedia; serializa cambios y hace rollback cuando una salida no arranca.
- `avatar/avatar-contract.js`: contrato neutral y normalizado de expresión, boca, ojos, pose y gaze.
- Live2D queda como un backend futuro; no se distribuye un runtime propietario aquí.

El renderer incluye un avatar geométrico de prueba para validar tracking sin depender de un modelo comercial.

## Output and streaming

The native engine supports the existing local recording profile and a direct RTMP/RTMPS profile. The direct streaming path does not require OBS.

OBS integration remains optional and lives in Electron Main through obs-websocket v5. It can control stream state and the current program scene when a local OBS server is available.

## Control protocol

El protocolo es JSON Lines sobre stdin/stdout. Las órdenes de captura admiten `source: "window"` y `source: "screen"`; esta última usa el monitor primario hasta que se añada selección explícita de display.

Cada petición Electron recibe un `id` generado localmente:

```json
{"type":"capture.start","source":"window","id":"5d1c..."}
```

La respuesta devuelve la misma correlación:

```json
{"ok":true,"id":"5d1c...","message":"capture=started"}
```

Esto permite solicitudes concurrentes sin confundir respuestas. El parser nativo sigue siendo intencionalmente pequeño: reconoce únicamente los comandos soportados y no pretende ser un parser JSON general.

## Seguridad del shell

El renderer trabaja con:

- `contextIsolation: true`;
- `nodeIntegration: false`;
- `sandbox: true`.

El renderer no puede lanzar procesos. `NativeEngine` vive en Electron Main y es el único componente que inicia el ejecutable nativo.

## Transporte multimedia: límite actual

El puente raw hacia FFmpeg transporta bytes de video/audio, pero **no transporta los PTS originales de captura dentro del protocolo del pipe**. `MediaGraphController` mantiene dos colas acotadas, selecciona globalmente el siguiente elemento por PTS y lo pacea contra un reloj monotónico compartido. La configuración actual de FFmpeg no debe interpretarse como una garantía de preservar timestamps del hardware/captura.

Por este motivo:

- la ruta A/V sigue siendo experimental;
- el compositor software sigue siendo una etapa de referencia/diagnóstico;
- el cierre ordenado del output intenta finalizar FFmpeg por EOF antes de usar terminación forzada;
- la validación de sincronización A/V real es un gate antes de promover esta ruta.

## Assets locales

Configuración opcional por variables de entorno:

- `CARI_NATIVE_EXECUTABLE`
- `CARI_MEDIAPIPE_MODEL_PATH`
- `CARI_AVATAR_MODEL_PATH`

No se inventan ni distribuyen assets propietarios desde el repositorio.

## Estado

La carpeta sigue siendo `experimental/` hasta validar en CI y hardware Windows:

- build nativo;
- protocolo de control;
- cierre y rollback;
- captura sostenida;
- recuperación de dispositivos;
- captura de pantalla primaria;
- sincronización A/V;
- rutas Unicode;
- ejecución de FFmpeg;
- rendimiento de tracking/render;
- integración real de avatar;
- streaming/RTMP.


## Actividad del avatar

El runtime procedural añade movimiento libre de baja amplitud y poses de actividad para teclado, mando y móvil. Keyboard/Gamepad pueden marcar actividad automáticamente; móvil requiere control manual porque el runtime no infiere un teléfono físico a partir del tracking facial.
