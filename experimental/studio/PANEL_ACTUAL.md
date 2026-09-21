# PANEL DE CARI STUDIO — MAPA ACTUAL

Este documento representa la UI que existe hoy; no es un mockup futuro.

## Ventana principal
- **Header:** Cari Studio, buscador de comandos, estado Engine/Twitch/OBS, indicador LIVE/OFFLINE, botón "Iniciar motor".
- **Sidebar:** navegación por módulos.
- **Workspace:** panel activo.

## Vista 1 — En vivo
Es la superficie principal de producción.
- Preview central del avatar.
- Cámara pequeña.
- Indicador de tracking.
- Acciones rápidas.
- Captura de ventana / pantalla.
- Voz local: Normal / Anime Bright.
- Diagnóstico.
- Botones: Grabar / Iniciar directo.

## Vista 2 — Panel
Supervisión global:
- Native Windows.
- Capture.
- Audio.
- Output.
- Twitch.
- OBS.
- Pipeline Windows Graphics Capture / WASAPI / MediaPipe / Three.js / FFmpeg.
- Diagnóstico multimedia, drops, late frames, pacing, bytes y salida.

## Vista 3 — Escenas
- Lista de escenas.
- Nueva escena.
- Tipo de transición.
- Duración.
- Aplicación de transición.

## Vista 4 — Fuentes
Superficie de selección:
- Pantalla.
- Ventana.
- Cámara.
- Audio.
- Media/assets.
- OBS opcional.

## Vista 5 — Audio
- Mixer micrófono.
- System loopback.
- Pista futura/TTS.
- Voice FX.
- Normal.
- Anime Bright.
- Pitch/Formant aparece como etapa futura, no implementada.

## Vista 6 — Salidas
- Grabación local MKV.
- RTMP/RTMPS.
- OBS opcional.
- Resiliencia/backoff.
- Diagnóstico de categoría de fallo.

## Vista 7 — VTuber / Editor de acciones
- Preview.
- Lista de acciones.
- Inspector.
- Importar/exportar presets.
- Crear acción.
- Frames/imágenes.
- Expresiones y hotkeys.

## Vista 8 — Tracking
- Cámara.
- Face Landmarker.
- Head X/Y/Roll.
- Gaze X/Y.
- Mouth.
- Blink.
- Expression.

## Vista 9 — Avatar
- Preview Three.js.
- Cargar GLB/glTF.
- Overlay On/Off.
- Backend Three.js.
- Live2D adapter.
- VRM/native compositor futuro.

## Vista 10 — Expresiones
- Estados de actuación.
- Acciones/expresiones preparadas para hotkeys.

## Vista 11 — Assets
- Biblioteca local.
- Presets.
- Editor de acciones.

## Vista 12 — Chat
- Twitch.
- OAuth.
- EventSub WebSocket.
- Log.
- Envío de mensajes.
- Comandos locales: `!happy`, `!sad`, `!talk`, `!silent`, `!angry`.

## Vista 13 — Centro Twitch
- Superficie de conexión/estado y capacidades del canal.

## Ventana secundaria — Avatar Overlay
Existe una BrowserWindow transparente separada:
- always-on-top.
- click-through.
- sin marco.
- render del avatar.
- estado de actuación enviado desde la ventana principal.

## Arquitectura visual

```
┌─────────────────────────────────────────────────────────────────────┐
│ CARI STUDIO | Buscar | ENGINE | TWITCH | OBS | LIVE | Iniciar motor│
├───────────────┬─────────────────────────────────────────────────────┤
│ NAV           │                 WORKSPACE                           │
│               │                                                     │
│ En vivo       │  ┌────────────────────┐ ┌────────────────────────┐ │
│ Panel         │  │                    │ │ Acciones rápidas       │ │
│ Escenas       │  │     PREVIEW        │ │ Captura                │ │
│ Fuentes       │  │ Avatar + Camera    │ │ Voz                    │ │
│ Audio         │  │                    │ │ Diagnóstico            │ │
│ Salidas       │  └────────────────────┘ └────────────────────────┘ │
│ VTuber        │                                                     │
│ Tracking      │                                                     │
│ Avatar        │                                                     │
│ Expresiones   │                                                     │
│ Assets        │                                                     │
│ Chat          │                                                     │
│ Twitch Center │                                                     │
└───────────────┴─────────────────────────────────────────────────────┘
                         │
                         ▼
             Electron / Native Engine
                         │
       ┌─────────────────┼──────────────────┐
       ▼                 ▼                  ▼
 Graphics Capture     WASAPI             Avatar/Tracking
       │                 │                  │
       └──────────────┬──┴──────────────────┘
                      ▼
                Media Graph
                      │
                  FFmpeg
                ┌─────┴─────┐
                ▼           ▼
             Archivo       RTMP
```

## Lectura arquitectónica
La UI actual ya se parece a una herramienta de producción y no solamente a un launcher. La separación correcta es:
**control/UI arriba → motor multimedia local abajo → avatar/tracking como subsistema → outputs al final**.

El principal hueco visual/funcional todavía no es la cantidad de paneles: es que el avatar debe entrar realmente al frame final del encoder mediante un compositor GPU/native. Hasta cerrar eso, el overlay es una superficie de preview/operación, no una garantía de composición final.
