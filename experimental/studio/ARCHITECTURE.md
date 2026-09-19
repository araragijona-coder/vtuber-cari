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
        │ stdin/stdout JSONL
        ▼
Native Windows Engine (C++)
  Windows Graphics Capture
  WASAPI + timeline mixer
  FrameBridge
  MediaGraphController
  RawPipe
  FFmpeg A/V output
        │
        ├── local recording
        └── future validated streaming outputs
```

## Captura y audio

El motor nativo es la fuente de verdad para:

- captura de ventana/pantalla;
- audio WASAPI;
- mezcla y timeline de audio;
- recuperación del dispositivo de captura;
- ciclo de vida del media graph;
- transporte hacia FFmpeg.

La UI no escribe frames ni buffers de audio directamente.

## Avatar y tracking

El avatar permanece desacoplado del motor multimedia:

- `avatar/face-tracker.js`: adaptador local de MediaPipe Face Landmarker.
- `avatar/face-tracking-bridge.js`: convierte blendshapes/pose en estado de actuación.
- `avatar/acting-bridge.js`: estado neutral consumido por cualquier renderer.
- `avatar/three-avatar.js`: renderer WebGL con Three.js y assets glTF/GLB.
- Live2D queda como un backend futuro; no se distribuye un runtime propietario aquí.

El renderer incluye un avatar geométrico de prueba para validar tracking sin depender de un modelo comercial.

## Control protocol

El protocolo es JSON Lines sobre stdin/stdout.

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

El puente raw hacia FFmpeg transporta bytes de video/audio, pero **no transporta los PTS originales de captura dentro del protocolo del pipe**. La configuración actual de FFmpeg no debe interpretarse como una garantía de preservar timestamps del hardware/captura.

Por este motivo:

- la ruta A/V sigue siendo experimental;
- el compositor software sigue siendo una etapa de referencia/diagnóstico;
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
- sincronización A/V;
- rutas Unicode;
- ejecución de FFmpeg;
- rendimiento de tracking/render;
- integración real de avatar;
- streaming/RTMP.

