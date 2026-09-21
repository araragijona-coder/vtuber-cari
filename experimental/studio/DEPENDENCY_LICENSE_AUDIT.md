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

## Toolchain instalado por Cari-Setup.ps1

Estos componentes son herramientas locales de desarrollo/entorno. No se consideran automáticamente parte del instalador redistribuible de Cari Studio.

| Componente | ID WinGet | Licencia/condición | Redistribución con Cari |
|---|---|---|---|
| Git for Windows | Git.Git | GPL-2.0 | No embebido |
| Node.js 22 | OpenJS.NodeJS.22 | MIT | No embebido |
| CMake | Kitware.CMake | BSD-3-Clause | No embebido |
| Visual Studio Build Tools | Microsoft.VisualStudio.BuildTools | Condiciones Microsoft | No embebido |
| FFmpeg | Gyan.FFmpeg | GPL-3.0 según manifest consultado | Instalación local; redistribución pendiente |

Regla: que el setup pueda instalar FFmpeg en la máquina del usuario no autoriza a incluir ese binario dentro del instalador final. Ese análisis permanece separado y explícito.