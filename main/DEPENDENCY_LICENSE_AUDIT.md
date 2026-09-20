# Cari Studio — Dependency license audit

Fecha: 2026-09-20

| Componente | Versión | Uso | Licencia de referencia | Estado |
|---|---:|---|---|---|
| Electron | 44.4.2 | Shell Windows / control plane | MIT | registrada |
| Three.js | 0.186.0 | Render WebGL / GLTF | MIT | registrada |
| obs-websocket-js | 5.0.8 | OBS opcional | MIT | registrada |
| @mediapipe/tasks-vision | 1.0.1 | Face Landmarker | Apache-2.0 del proyecto MediaPipe | registrada |

## Reglas

- Registrar la licencia antes de incorporar una dependencia nueva.
- Auditar por separado modelos VRM/Live2D, texturas, audio, fuentes, iconos y otros assets.
- No empaquetar un runtime propietario sin comprobar sus condiciones.
- FFmpeg y codecs quedan pendientes de decisión explícita de redistribución.
- Los placeholders del proyecto no autorizan la distribución de assets de terceros.

## MediaPipe

La documentación actual del proyecto indica que las entradas de MediaPipe Tasks se procesan en el dispositivo y no se envían a servidores de Google, pero también indica que las APIs envían métricas de rendimiento/uso a Google. Esto debe reflejarse en la política de privacidad del producto.

## Referencias

- https://github.com/electron/electron/blob/main/package.json
- https://github.com/mrdoob/three.js
- https://github.com/obs-websocket-community-projects/obs-websocket-js
- https://github.com/google-ai-edge/mediapipe
