# Cari Studio — Bitácora canónica


Fecha: 20/09/2026
Distribución: main/
HEAD de main: 8188e3a8f9fcd3b055af033f2078784e5768b776
Origen: fix/native-windows-foundation
PR: #2
Avance: 63%
Readiness: NO listo para producción

## Estados
IMPLEMENTADO = existe código.
VERIFICADO = prueba reproducible observada.
VALIDADO EN HARDWARE = probado en Windows/PC objetivo.
PENDIENTE = falta evidencia/integración.
NO REPETIR = no reconstruir; trabajar sobre el gate restante.

## NO REPETIR

Arquitectura: Electron + Native C++ implementados; preload/contextIsolation/sandbox implementados; NativeEngine + JSONL implementado; Session manager rollback/stop-only verificado.

Captura: WGC ventana/pantalla implementados; enumeración de ventanas verificada; frame-pool recreate y device-loss implementados; LatestItemQueue + worker implementados; cámara Media Foundation implementada pero falta validación sostenida; Game Capture pendiente.

Audio: WASAPI mic/loopback implementado; QPCPosition 100 ns documentado; AudioTimelineMixer verificado; normalización de rate/canales verificada; anime-bright implementado; drift correction pendiente; lip-sync por amplitud implementado.

Multimedia: RawPipe OVERLAPPED, FFmpeg supervisor, EOF/flush, stderr 256 KiB, MediaClock, RealtimePacer, interleaver A/V, dispatch budget, backpressure, diagnostics y retry network implementados/verificados según sus smoke/tests.

Avatar: contrato, Three.js, GLTF/GLB, placeholder, MediaPipe, timestamp guard y blendshape mapping implementados; avatar real integrado al frame final pendiente; Live2D adapter-only pendiente.

Streaming: OBS WebSocket y Twitch EventSub implementados; multi-stream pendiente; FFmpeg se mantiene externo; instalación self-build añadida; instalador firmado pendiente.

## Trabajo de esta ronda
1. Revisada bitácora y árbol real antes de modificar.
2. Añadida distribución principal main/.
3. Añadidos INSTALL_WINDOWS.ps1 y RUN_CARI_STUDIO.ps1.
4. Agregada política de FFmpeg externo, sin binario dentro del repo.
5. Consolidado el estado y los gates en una sola bitácora dentro de main/.

## Pruebas NO repetir sin cambio
scheduler/interleaver C++20 + -Wall -Wextra -Werror: PASS.
output retry smoke: PASS.
diagnostics smoke: PASS.
latest item queue smoke: PASS.
FFmpeg sintético BGRA/PCM -> H.264/AAC -> Matroska: PASS en Linux.
D3D11 WARP smoke: PASS.
Actions con steps=null: no diagnostican regresiones de C++.

## Gates abiertos
P0: CI Windows observable; E2E named-pipe -> FFmpeg -> archivo -> decode en Windows; worker WGC + device-loss en hardware.
P1: framing PTS explícito; encoder boundary sin readback CPU por frame; sincronización temporal avatar; contrato Frame/PTS.
P2: cámara sostenida; device clocks; drift correction; lip-sync avanzado.
P3: RTMP sostenido; caída de red real; validar retry; Twitch/YouTube real.
P4: Game Capture; multistream; instalador firmado; asset packaging; validación PC objetivo.

## Regla anti-repetición
Antes de tocar código: buscar el componente aquí; leer su gate; no crear una segunda implementación equivalente; registrar hallazgos nuevos; cambiar porcentaje solo por evidencia nueva.

## Estado actual
63% — ingeniería.
NO production-ready.
main/ = distribución principal instalable como build local.