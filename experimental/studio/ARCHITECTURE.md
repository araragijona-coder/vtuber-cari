# Cari Studio — arquitectura técnica

## Objetivo
Cari Studio es una herramienta Windows-first de streaming y VTubing con operación local. La interfaz Electron es un control plane; la captura, audio y salida multimedia pertenecen al motor nativo C++.

No se requiere IA para operar el programa y no se depende de una API cloud para las funciones principales.

## Capas
```
Electron Renderer
  UI · escenas · controles · avatar · métricas
        │ contextBridge / IPC
Electron Main
  lifecycle · JSON-lines · eventos · proceso nativo
        │ stdin/stdout
Native Windows Engine (C++)
  capture · WASAPI · media graph · FFmpeg · control protocol
        │
  Windows capture/audio + local FFmpeg
        │
  recording / RTMP
```

## Avatar
El avatar se mantiene desacoplado del motor multimedia:

- `avatar/face-tracker.js`: MediaPipe Face Landmarker local.
- `avatar/acting-bridge.js`: estado neutral entre tracking, expresiones y renderer.
- `avatar/three-avatar.js`: Three.js + glTF/GLB.
- Live2D puede incorporarse como backend adicional sin cambiar el protocolo nativo.

Los assets/modelos no se inventan ni se redistribuyen desde este repositorio: se cargan desde rutas locales configuradas por el usuario.

## Captura y audio
El motor nativo es la fuente de verdad para captura de ventana/pantalla, audio WASAPI, mezcla/timeline, timestamps, transporte hacia FFmpeg y ciclo de vida del pipeline.

La UI no escribe frames ni audio directamente.

## Control
Los comandos son JSON Lines sobre stdin:

```json
{"type":"status"}
{"type":"capture.start","source":"window"}
{"type":"capture.stop"}
{"type":"audio.start"}
{"type":"audio.stop"}
{"type":"output.start","profile":"local-record"}
{"type":"output.stop"}
```

Las respuestas/eventos regresan por stdout como una línea JSON.

## Seguridad del shell
El renderer no puede ejecutar procesos ni recibir acceso Node.

El proceso nativo se resuelve en Electron Main mediante `CARI_NATIVE_EXECUTABLE`, el paquete de producción o la ubicación local de desarrollo.

El renderer solamente puede enviar comandos del protocolo expuesto por `contextBridge`.

## Estado actual
Esta carpeta sigue siendo experimental hasta que las pruebas de CI y las pruebas en hardware Windows confirmen captura sostenida, sincronización A/V, recuperación ante desconexión de FFmpeg, rollback de start parcial, Unicode en rutas, cierre limpio y rendimiento estable.

No debe tratarse todavía como una aplicación de producción.