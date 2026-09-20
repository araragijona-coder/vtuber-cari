> HISTÓRICO — No usar para nuevas entradas. La bitácora canónica es `experimental/studio/BITACORA.md`.
> Este archivo se conserva para contexto histórico.

# Cari Studio — Bitácora de arquitectura y auditoría

Última actualización: 2026-09-20
Rama: `fix/native-windows-foundation`

## Regla de estados

- **IMPLEMENTADO**: existe código integrado en la rama.
- **VERIFICADO**: existe una prueba reproducible que pasó.
- **VALIDADO EN HARDWARE**: comprobado en Windows/hardware objetivo real.
- **EXPERIMENTAL**: integrado para investigación, pero no debe considerarse producción.

## Estado global

**Estimación de ingeniería: 60%.**

El porcentaje representa hitos funcionales y de validación, no cantidad de archivos o líneas.

## 1. Plataforma y arquitectura

| Área | Estado | Nota |
|---|---|---|
| Electron local shell | IMPLEMENTADO | renderer/main/preload separados |
| Native Windows engine | IMPLEMENTADO | C++20 |
| Comunicación Electron → native | VERIFICADO | protocolo JSONL determinista |
| OBS WebSocket opcional | IMPLEMENTADO | no es dependencia del engine |
| separación core/native/electron | IMPLEMENTADO | módulos independientes |

## 2. Captura

| Área | Estado | Nota |
|---|---|---|
| Windows Graphics Capture | IMPLEMENTADO | ventana y pantalla |
| enumeración de ventanas | VERIFICADO | índice estable para UI |
| resize/recreate | IMPLEMENTADO | FramePool |
| device-loss recovery | IMPLEMENTADO | DXGI removed/reset/hung |
| captura CPU readback | IMPLEMENTADO | ruta de referencia/diagnóstico |
| GPU zero-copy | PENDIENTE | no marcar como terminado |
| Game Capture | PENDIENTE | futuro |

## 3. Audio

| Área | Estado | Nota |
|---|---|---|
| WASAPI microphone | IMPLEMENTADO | |
| system loopback | IMPLEMENTADO | |
| mixer timeline | IMPLEMENTADO | |
| bounded queues | IMPLEMENTADO | |
| voice effect anime-bright | IMPLEMENTADO | filtro simple, no pitch/formant real |
| formato/timeline smoke tests | VERIFICADO | |
| drift correction | PENDIENTE | |
| audio hardware validation | PENDIENTE | |

## 4. Media clock / A-V

| Área | Estado | Nota |
|---|---|---|
| canonical 100-ns timestamps | IMPLEMENTADO | |
| MediaClock | VERIFICADO | C++20 strict warnings |
| RealtimePacer | VERIFICADO | |
| global audio/video interleaving | IMPLEMENTADO | menor PTS primero |
| bounded pacing budget | IMPLEMENTADO | evita ráfagas ilimitadas |
| late-video policy | IMPLEMENTADO | |
| audio catch-up policy | PENDIENTE | política final por validar |
| explicit PTS through raw pipes | PENDIENTE | actualmente se usa pacing, no transporte PTS |
| physical clock drift correction | PENDIENTE | |

## 5. Output

| Área | Estado | Nota |
|---|---|---|
| FFmpeg supervisor | IMPLEMENTADO | |
| local recording profile | IMPLEMENTADO | |
| RTMP/RTMPS profile | IMPLEMENTADO | |
| raw BGRA video contract | VERIFICADO | |
| PCM float audio contract | VERIFICADO | |
| H.264/AAC mux smoke | VERIFICADO | prueba FFmpeg local |
| output diagnostics | IMPLEMENTADO | categorías network/encoder/input/mux/permission |
| bounded RTMP retry | IMPLEMENTADO | 1s → 2s → 4s... máximo 30s, máximo 5 intentos |
| retry only network failures | IMPLEMENTADO | no reintenta encoder/mux/permission a ciegas |
| sustained Windows named-pipe FFmpeg | PENDIENTE | |
| sustained recording | PENDIENTE | |
| real RTMP validation | PENDIENTE | |
| reconnect validation against real server | PENDIENTE | |

## 6. Avatar / tracking

| Área | Estado | Nota |
|---|---|---|
| avatar contract | IMPLEMENTADO | estado normalizado/clamped |
| Three.js renderer | IMPLEMENTADO | |
| GLB/glTF loader | IMPLEMENTADO | |
| placeholder avatar geometry | IMPLEMENTADO | sin asset propietario |
| MediaPipe Face Landmarker | IMPLEMENTADO | VIDEO mode |
| monotonic timestamp guard | IMPLEMENTADO | |
| face → avatar bridge | IMPLEMENTADO | mouth/blink/smile/brows/pose |
| Live2D | ADAPTER-ONLY | runtime/licencia todavía no distribuido |
| avatar → native final frame | PENDIENTE | principal integración restante |
| GPU compositor final | PENDIENTE | |
| lip-sync producción | PENDIENTE | |

## 7. Electron / seguridad local

| Área | Estado | Nota |
|---|---|---|
| contextIsolation | IMPLEMENTADO | |
| nodeIntegration disabled | IMPLEMENTADO | |
| sandbox | IMPLEMENTADO | |
| preload allowlist | IMPLEMENTADO | |
| navegación remota bloqueada | IMPLEMENTADO | |
| camera permission local-only | IMPLEMENTADO | |
| local file URL handling | IMPLEMENTADO | pathToFileURL |
| external content policy | PENDIENTE | auditoría final |

## 8. CI

| Área | Estado | Nota |
|---|---|---|
| CMake strict warnings | IMPLEMENTADO | /W4 /WX /permissive- |
| native Windows workflow | IMPLEMENTADO | build/test/package |
| Electron checks | IMPLEMENTADO | |
| smoke tests registered | IMPLEMENTADO | |
| CI verde actual | PENDIENTE | runs recientes no aportaron pasos/logs suficientes |
| hardware CI | PENDIENTE | |

## 9. Bitácora de trabajo — NO REPETIR

### Ya realizado

1. Separación Electron/native/core.
2. Windows Graphics Capture para ventana/pantalla.
3. WASAPI mic + loopback.
4. MediaClock y dominio temporal canónico.
5. RealtimePacer.
6. Interleaving global A/V.
7. bounded queues y pacing budget.
8. FFmpeg supervisor.
9. perfiles local-record y RTMP.
10. MediaPipe FaceLandmarker.
11. guard de timestamps monótonos.
12. contrato de avatar Three.js/glTF.
13. permisos de cámara local.
14. hardening Electron.
15. smoke tests de protocolo, timing, avatar y ventanas.
16. clasificación de errores de output.
17. retry/backoff RTMP limitado a fallos de red.
18. métrica de estado/reintento visible en el control plane.
19. prueba local de H.264 + AAC + Matroska mediante FFmpeg.

### Intentos/cambios descartados

- No transportar PTS inventados dentro de raw pipes: se mantuvo el pacing como solución intermedia y quedó explícitamente marcado como limitación.
- No declarar el compositor Three.js como parte del frame final: todavía no existe el puente GPU/native completo.
- No añadir OpenCV por obligación: Windows Graphics Capture + MediaPipe cubren el camino actual; OpenCV queda opcional para procesamiento posterior.
- No usar Live2D runtime propietario como dependencia: solo contrato/adaptador.
- No declarar CI verde cuando los runners fallan/cancelan antes de producir steps/logs útiles.
- No reintentar automáticamente errores de encoder, muxer, permisos o entrada.
- No sustituir la aplicación por OBS: OBS permanece integración opcional.

## 10. Siguiente cola priorizada

1. **Validación real del named-pipe → FFmpeg en Windows**.
2. **Prueba sostenida de grabación local**.
3. **RTMP real + reconnect/backoff**.
4. **Compositor GPU/native: avatar + captura → frame final**.
5. **PTS explícitos o transporte temporal equivalente extremo a extremo**.
6. **Audio drift correction y política de catch-up**.
7. **Media Foundation camera source**.
8. **Game Capture**.
9. **lip-sync y mezcla avatar/audio**.
10. **multistream**.
11. **instalador/redistribución FFmpeg/diagnóstico de usuario**.
12. **hardware validation y release candidate**.

## 11. Regla de continuidad

Antes de modificar una de las áreas anteriores, comprobar esta bitácora y reutilizar el código existente. Una tarea solo vuelve a abrirse si aparece una regresión, una prueba nueva que la invalida o una necesidad arquitectónica documentada.

**Objetivo:** dejar de repetir implementación y dedicar cada iteración a un pendiente verificable.
