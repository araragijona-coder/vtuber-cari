# BITÁCORA DE INGENIERÍA — Cari Studio

> Propósito: evitar repetir auditorías o implementar dos veces la misma pieza.  
> Estados: **IMPLEMENTADO** = código integrado; **VERIFICADO** = pruebas estáticas/smoke o revisión de contrato; **VALIDADO EN HARDWARE** = probado en Windows con hardware/flujo real sostenido.

## Corte
- Rama: `fix/native-windows-foundation`
- PR: #2
- Último corte documentado: 2026-09
- Regla: ningún elemento se considera "terminado" solo porque compile.

## 1. Registro de trabajo completado

| Área | Estado | Evidencia/resultado | No rehacer |
|---|---|---|---|
| Windows Graphics Capture — pantalla primaria | IMPLEMENTADO / VERIFICADO | `CaptureEngine` usa GraphicsCaptureItem de monitor | No volver a diseñar captura de pantalla desde cero |
| Windows Graphics Capture — ventana | IMPLEMENTADO / VERIFICADO | Enumeración + índice + selección explícita | No volver a inventar selector de ventanas |
| Resize/device loss | IMPLEMENTADO | Recreación de frame pool + recuperación DXGI | Solo mejorar tras prueba real |
| WASAPI mic + loopback | IMPLEMENTADO | Captura local y mezcla temporal | No reemplazar por una librería externa sin evidencia |
| Voice FX Anime Bright | IMPLEMENTADO | HPF/presence/soft-clip local | No llamarlo pitch/formant; eso sigue pendiente |
| MediaClock | IMPLEMENTADO / VERIFICADO | ticks 100 ns, monotonicidad y conversiones | No crear otro reloj multimedia |
| RealtimePacer | IMPLEMENTADO / VERIFICADO | pacing contra reloj monotónico | Pendiente validar sostenido |
| Bounded queues | IMPLEMENTADO | límites de audio/video + métricas | No duplicar otra cola sin necesidad |
| FFmpeg supervisor/output | IMPLEMENTADO | proceso Windows, EOF/flush y perfiles | Falta prueba sostenida real |
| Raw transport | IMPLEMENTADO | pipes overlapped y límites | No declarar PTS preservado: sigue siendo transporte raw |
| A/V ordering | IMPLEMENTADO / VERIFICADO PORTABLE | Menor PTS entre audio/video + límite por polling | No crear otro scheduler; solo mejorar con evidencia real |
| Output diagnostics | IMPLEMENTADO | clasificación network/encoder/input/mux/permission | Afinar con stderr real, no rehacer arquitectura |
| RTMP retry/backoff | IMPLEMENTADO | backoff acotado, solo fallos clasificados como red | Falta prueba real de caída/reconexión; no reintentar encoder/mux/input |
| Electron shell | IMPLEMENTADO / VERIFICADO | sandbox, contextIsolation, IPC explícito | No migrar framework por estética |
| Three.js avatar | IMPLEMENTADO / EXPERIMENTAL | GLB/glTF + placeholder + morph aliases | Falta composición nativa en frame final |
| MediaPipe Face Landmarker | IMPLEMENTADO / VERIFICADO | VIDEO mode + timestamp monotónico | Falta benchmark real y posible LIVE_STREAM |
| Live2D | ADAPTADOR PENDIENTE | Boundary definido, sin runtime/asset propietario | No incluir SDK propietario en repo |
| Avatar 2D action runtime | IMPLEMENTADO / TEST LOCAL | Action Store + frame player + router + VAD/Twitch + persistence | Falta Windows sustained + encoder compositor |
| Avatar overlay | IMPLEMENTADO | BrowserWindow transparente separado | Falta integración GPU/native compositor |
| Twitch UI/backend | PARCIAL | Chat/EventSub surface y servicios presentes | Falta cerrar permisos/OAuth/flujo real |
| OBS integración | OPCIONAL / IMPLEMENTADO | obs-websocket 5.x | No convertir OBS en dependencia del motor |
| Multistream | PENDIENTE | Arquitectura aún no validada | No implementar antes de estabilizar single-output |
| Instalador | NO NECESARIO AHORA | Electron + runtime portable es suficiente para fase experimental | No gastar trabajo en instalador todavía |
| CI Windows | PARCIAL | Workflow existe; ejecuciones recientes no son verdes | No declarar CI verde hasta runner/steps reales |
| Blender FBX -> VRM 1.0 | IMPLEMENTADO / CONTRATO VERIFICADO | Pipeline único + preflight + audit + Humanoid/expressions/MToon/export/reimport | Falta FBX real + ejecución Windows |
| Hardware validation | PENDIENTE | No equivale a compilar | Requiere Windows + captura + audio + FFmpeg sostenido |

## 2. Decisiones arquitectónicas ya tomadas
1. El motor principal es local-first.
2. OBS es integración opcional, no el núcleo.
3. Windows Graphics Capture + WASAPI son la base nativa.
4. Electron es panel/control y renderer VTuber; C++ maneja captura/media/output.
5. Three.js es backend abierto principal; Live2D queda como adapter.
6. Código dudoso permanece bajo `experimental/studio/` hasta validación.
7. No se distribuyen modelos comerciales/proprietarios.
8. FFmpeg es proceso supervisado; la salida de red no se reintenta indiscriminadamente.
9. La bitácora es fuente de continuidad: antes de crear un módulo nuevo se comprueba esta tabla.

## 3. Intentos descartados / no repetir
- No usar OBS como motor obligatorio.
- No usar IA/cloud para que el programa funcione.
- No enviar frames con `capturePage` como solución de compositor final.
- No afirmar que raw pipes preservan PTS originales.
- No llamar "anime voice" a un pitch/formant completo: actualmente es DSP tonal/presence suave.
- No añadir OpenCV solo por nombre: la captura Windows nativa ya cubre la pantalla; OpenCV puede quedar como herramienta de cámara/preprocesado si aporta una necesidad concreta.
- No incluir Live2D SDK/recursos propietarios.
- No crear instalador antes de estabilizar runtime portable.
- No declarar CI verde por la mera existencia del workflow.

## 4. Próximo orden de trabajo

> Fuente canónica: `experimental/studio/BITACORA.md`.


> Fuente canónica de continuidad: `experimental/studio/BITACORA.md`. Los estados de este archivo se mantienen como resumen histórico y no deben contradecir la bitácora maestra.

### P0 — estabilidad del media graph
- [x] Seleccionar globalmente el siguiente evento por menor PTS entre audio/video.
- [x] Definir límite de eventos por polling para evitar bursts; la política de audio atrasado mantiene continuidad y contabiliza lateness.
- [ ] Smoke tests de interleaving, late audio/video, resolución dinámica y cadence drops.

### P1 — output real
- [ ] Validar FFmpeg real sostenido en Windows.
- [ ] Probar archivo local completo.
- [ ] Probar RTMP/RTMPS real.
- [ ] Probar caída de red + backoff + reconexión.
- [ ] Clasificar stderr real y conservar diagnóstico.

### P1 — compositor/avatar
- [ ] Definir compositor GPU D3D11.
- [ ] Integrar avatar/overlay en el frame que realmente entra al encoder.
- [ ] Evitar readback CPU por frame en la ruta final.
- [ ] Medir FPS/latencia/memoria.

### P2 — cámara/tracking
- [ ] Benchmark MediaPipe.
- [ ] Evaluar LIVE_STREAM para cámara si mejora latencia.
- [x] Preflight Blender/VRM permite validar dependencias sin asset.
- [ ] Media Foundation/cámara nativa si el camino web no alcanza.
- [ ] Lip-sync y mapping fino.

### P2 — producto
- [ ] Scenes/source graph persistente.
- [x] Chat/event actions reales para Avatar 2D en Electron renderer.
- [ ] Multistream después de single-output estable.
- [ ] Empaquetado portable/release cuando el runtime sea validado.

## 5. Regla de cierre
Una tarea pasa a "terminada" solamente cuando tiene:
**código + prueba apropiada + diagnóstico/documentación + criterio de aceptación**.
