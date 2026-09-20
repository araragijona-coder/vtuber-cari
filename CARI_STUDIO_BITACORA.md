# Cari Studio — Bitácora maestra de ingeniería

> Fuente única de continuidad para evitar repetir auditorías, implementaciones o pruebas ya realizadas.
>
> Estados usados:
> - **IMPLEMENTADO**: el código/contrato existe en GitHub.
> - **VERIFICADO**: existe evidencia reproducible de prueba.
> - **VALIDADO-HARDWARE**: probado en Windows/hardware/servicio real objetivo.
> - **PENDIENTE**: no debe darse por terminado.

## Regla de continuidad

Antes de implementar o investigar nuevamente un punto:
1. buscarlo aquí;
2. revisar su estado y evidencia;
3. solo continuar desde el último pendiente;
4. no repetir pruebas marcadas como VERIFICADO salvo que cambie el contrato o aparezca una regresión.

## Estructura y decisión de ubicación

- El desarrollo principal continúa en la rama `fix/native-windows-foundation`.
- `experimental/` queda reservado para componentes que todavía no tienen evidencia suficiente para promoción.
- No se promueve código a la rama `main` mientras existan gates críticos sin verificar.
- Esta bitácora está en la raíz del repositorio para que sea visible sin entrar en subdirectorios.
- No se crean nuevas áreas experimentales: todos los componentes dudosos deben permanecer dentro de la única zona `experimental/`.

## Arquitectura base — IMPLEMENTADO

- [x] Electron Renderer como control plane.
- [x] Electron Main como lifecycle/process plane.
- [x] Native Windows C++ como media engine.
- [x] Windows Graphics Capture para ventana.
- [x] Windows Graphics Capture para pantalla primaria.
- [x] Enumeración de ventanas.
- [x] D3D11 capture foundation.
- [x] WASAPI micrófono.
- [x] WASAPI system loopback.
- [x] AudioTimelineMixer.
- [x] VoiceEffectProcessor local.
- [x] FrameBridge.
- [x] MediaClock.
- [x] RealtimePacer.
- [x] MediaInterleaver global A/V.
- [x] MediaGraphController.
- [x] RawPipe con I/O overlapped y backpressure.
- [x] FFmpeg process supervisor.
- [x] Grabación local.
- [x] RTMP/RTMPS directo.
- [x] OBS WebSocket opcional; OBS no es dependencia del core.
- [x] Contrato neutral de avatar.
- [x] MediaPipe Face Landmarker adapter.
- [x] FaceTrackingBridge.
- [x] Three.js + GLTF/GLB adapter.
- [x] Live2D reservado como backend/adaptador futuro, sin runtime propietario distribuido.

## Multimedia — IMPLEMENTADO

- [x] Contratos `Frame` y `AudioPacket`.
- [x] Colas acotadas.
- [x] Métricas de descarte.
- [x] Validación de resolución.
- [x] Validación de sample rate/canales durante la sesión.
- [x] Pacing por PTS contra reloj monotónico.
- [x] Interleaving global A/V por PTS.
- [x] Desempate audio antes de video.
- [x] Presupuesto máximo de 8 eventos por polling.
- [x] Backpressure de arranque: no drenar audio antes de conectar ambos pipes.
- [x] Cierre FFmpeg por EOF/flush antes de terminación forzada.
- [x] Reconciliación cuando FFmpeg termina inesperadamente.
- [x] Estado/código de salida expuestos.
- [x] Retención de stderr limitada a 256 KiB.
- [x] Clasificación básica de errores: network/encoder/input/mux/permission/unknown.
- [x] Política de retry exponencial acotada: 1 s inicial, 30 s máximo, 5 intentos.
- [x] Retry automático solo para outputs RTMP con señales clasificadas como network.
- [x] Cancelación del retry cuando existe un stop explícito.

## Audio — IMPLEMENTADO / NO REIMPLEMENTAR

- [x] Mic + loopback pasan por un timeline común.
- [x] Normalización inicial de sample rate/canales.
- [x] Bloques de 20 ms.
- [x] VoiceEffectProcessor es DSP de tono/dinámica, no pitch/formant engine.
- [x] WASAPI QPCPosition usa la unidad temporal entregada por Windows; no volver a convertir como si fueran ticks QPC crudos.

## Captura — IMPLEMENTADO / NO REIMPLEMENTAR

- [x] Window capture.
- [x] Primary display capture.
- [x] Frame callback free-threaded.
- [x] Recreate del frame pool por cambios de tamaño.
- [x] Recuperación de device removed/reset/hung.
- [x] Selección de ventana por índice.
- [ ] Captura de cámara Media Foundation.
- [ ] Game Capture dedicado.
- [ ] Validación exhaustiva en hardware real.

## Avatar / tracking — IMPLEMENTADO PARCIAL

- [x] Contrato neutral de actuación.
- [x] Clamping/normalización de expresión, mouth, blink, pose y gaze.
- [x] MediaPipe Face Landmarker en modo VIDEO.
- [x] Guardia contra timestamps no crecientes.
- [x] FaceTrackingBridge.
- [x] Three.js renderer y GLTF/GLB loader.
- [x] Placeholder geometry para no depender de assets propietarios.
- [ ] Modelo VRM/GLB real aprobado.
- [ ] Lip-sync a partir de audio real.
- [ ] Compositor avatar -> frame final nativo.
- [ ] Validación de rendimiento sostenido.
- [ ] Live2D adapter real.

## Shell Electron — IMPLEMENTADO

- [x] contextIsolation.
- [x] nodeIntegration desactivado.
- [x] sandbox.
- [x] contextBridge con wrappers explícitos.
- [x] NativeEngine en Main.
- [x] navegación local file:// endurecida.
- [x] permiso de cámara limitado al renderer local.
- [x] OBS WebSocket v5 opcional.
- [x] Session Manager con serialización y rollback.
- [x] pruebas de sesión/avatar.

## Streaming — IMPLEMENTADO PARCIAL

- [x] Perfil local-record.
- [x] Perfil RTMP/RTMPS.
- [x] FFmpeg output boundary.
- [x] Diagnóstico de estado/exit code.
- [x] Clasificación básica de fallos.
- [x] Backoff/retry RTMP para fallos clasificados como red.
- [ ] RTMP real contra servicio externo.
- [ ] Reconexión validada en servicio real.
- [ ] Twitch/YouTube output sostenido.
- [ ] Multistream.
- [ ] Failover avanzado.
- [ ] Backoff validado en Windows.

## Pruebas — VERIFICADO

- [x] Smoke C++ portable con C++20 + `-Wall -Wextra -Werror`.
- [x] MediaClock.
- [x] RealtimePacer.
- [x] MediaInterleaver.
- [x] Selección de ventana.
- [x] Contrato de sesión/avatar.
- [x] Pruebas de rollback/stop-only.
- [x] FFmpeg sintético: BGRA raw + PCM float32 -> H.264/AAC -> Matroska.
- [x] FFmpeg probado con versión 7.1.5 en entorno Linux para validar formato/mapping/encoder/mux.
- [ ] Named pipes + FFmpeg sostenidos en Windows.
- [ ] Grabación prolongada en Windows.
- [ ] RTMP sostenido en Windows.
- [ ] Sincronización A/V prolongada.
- [ ] Hardware objetivo.

## CI — BLOQUEADO / NO DAR POR VERDE

- [x] Workflows configurados para la rama de desarrollo.
- [x] `workflow_dispatch` añadido.
- [x] Native Windows, CI y Character Runtime están asociados a pushes de la rama.
- [ ] CI verde actual.
- [ ] Native Windows Build con steps ejecutados.
- [ ] Electron shell check con steps ejecutados.

### Evidencia de bloqueo

Los runs más recientes terminan antes de registrar steps:
`steps = null`
y algunos también sin `logs_url`.

Se hicieron reintentos de los runs previos y el patrón persistió. Esto no se debe reinterpretar como fallo confirmado de una línea concreta del código.

## Intentos que NO deben repetirse

### 1. FIFO/FFmpeg como primera prueba sintética
- Resultado: el handshake de dos FIFOs se quedó bloqueado/expiró.
- Acción: se sustituyó por una prueba raw basada en archivos para aislar encoder/mapping/mux.
- Estado: **DESCARTADO como primera prueba sintética**.
- No repetir salvo que se pruebe específicamente el comportamiento de named pipes Windows.

### 2. Pacing separado de audio y video
- Problema encontrado: audio se drenaba antes que video.
- Corrección: `MediaInterleaver` global por PTS.
- Estado: **CORREGIDO**.
- No reimplementar otra cola de interleaving paralela.

### 3. Drenar audio antes de conectar pipes
- Problema: pérdida innecesaria durante handshake.
- Corrección: backpressure de arranque.
- Estado: **CORREGIDO**.
- No cambiar esa política sin nueva evidencia.

### 4. Reintentar indiscriminadamente cualquier fallo FFmpeg
- Riesgo: ocultar errores de encoder/mux/input/permission.
- Corrección: retry exclusivamente para RTMP + categoría network.
- Estado: **CORREGIDO**.
- No añadir retry global sin nueva política.

### 5. Acumulación ilimitada de stderr
- Riesgo: crecimiento indefinido en sesiones largas.
- Corrección: ventana máxima de 256 KiB.
- Estado: **CORREGIDO**.

### 6. Tratar QPCPosition WASAPI como ticks QPC crudos
- Estado: **CORREGIDO**.
- No volver a aplicar la conversión anterior.

### 7. Promover avatar directamente al encoder sin compositor nativo
- Estado: **NO CERRADO**.
- El Three.js renderer y tracking existen, pero todavía no forman parte de la señal codificada final.
- No marcar como terminado por tener renderer.

## Próximos puntos prioritarios — NO REPETIR LOS ANTERIORES

1. PTS explícitos extremo a extremo dentro del transporte multimedia.
2. Compositor D3D11/GPU que combine captura + avatar + overlays.
3. Cámara Media Foundation.
4. Game Capture.
5. Drift correction/resampling basado en relojes físicos.
6. Validación real de named pipes + FFmpeg en Windows.
7. Grabación sostenida.
8. RTMP sostenido + reconexión real.
9. Lip-sync.
10. Modelo/avatar real.
11. Multistream.
12. Instalador/distribución.
13. CI/runner health hasta conseguir jobs con steps y logs reales.

## Último estado

- Fecha de bitácora: 2026-09-20.
- Rama: `fix/native-windows-foundation`.
- PR: #2.
- Estado PR: abierto, draft.
- Main/base: no se fusiona todavía por gates de CI y hardware pendientes.
- Avance de ingeniería: **59%**.
- El porcentaje representa implementación total ponderada; no significa que 59% esté validado en hardware.

## Regla de cierre

Nunca convertir:
- `compila` en `funciona`;
- `CI` en `hardware real`;
- `API disponible` en `integración completada`;
- `renderer` en `frame final de streaming`;
- `retry implementado` en `reconexión probada`.
