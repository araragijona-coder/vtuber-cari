# Cari Studio — bitácora maestra de desarrollo

> Regla: este archivo es el registro operativo de referencia. Antes de implementar algo nuevo, revisar aquí y en `AUDIT_MATRIX.md`. No repetir investigación/código que figure como **IMPLEMENTADO** o **VERIFICADO** salvo que exista evidencia de regresión.

## Estados

- **IMPLEMENTADO**: código y contrato existen.
- **VERIFICADO**: existe prueba automatizada/local reproducible.
- **VALIDADO EN HARDWARE**: funciona en el Windows/PC objetivo.
- **PENDIENTE**: todavía falta evidencia o implementación.
- **DESCARTADO**: intento previo que no debe repetirse sin una razón nueva.

## Orden oficial de ejecución

### P0 — CI Windows + E2E

**Estado:** PENDIENTE.

Objetivo:
- conseguir una ejecución Windows que realmente llegue a los steps;
- ejecutar `cari-ffmpeg-named-pipe-e2e-smoke`;
- demostrar captura/pipe/FFmpeg/mux con named pipes en Windows.

No repetir:
- no declarar CI verde basándose solo en la existencia de un workflow;
- no confundir runs con `steps=null` con una prueba del código.

### P1 — Compositor GPU D3D11

**Estado:** PENDIENTE.

Objetivo:
```
captura D3D11
   +
avatar/overlays
   ↓
frame final GPU
   ↓
encoder/output
```

Estado actual:
- compositor software RGBA de referencia: IMPLEMENTADO;
- bridge BGRA de captura: IMPLEMENTADO;
- avatar Three.js: IMPLEMENTADO/EXPERIMENTAL;
- composición avatar → señal nativa final: PENDIENTE.

No repetir:
- no usar snapshots de `capturePage()` como compositor de producción;
- no promover el compositor software diagnóstico a producción.

### P2 — Timestamps A/V explícitos extremo a extremo

**Estado:** PENDIENTE.

Estado actual:
- timestamps canónicos en ticks de 100 ns: IMPLEMENTADO;
- MediaClock: VERIFICADO;
- RealtimePacer: VERIFICADO;
- interleaver global A/V por PTS: VERIFICADO;
- raw pipes de video/audio independientes: IMPLEMENTADO;
- PTS dentro del transporte raw: PENDIENTE.

No repetir:
- no afirmar que `-use_wallclock_as_timestamps` conserva timestamps originales de hardware;
- no afirmar sincronización A/V de producción antes de prueba sostenida.

### P3 — Cámara, drift, lip-sync

**Estado:** PENDIENTE.

Cámara:
- enumeración Media Foundation: IMPLEMENTADO;
- captura Media Foundation real: PENDIENTE.

Drift:
- AudioTimelineMixer: IMPLEMENTADO;
- normalización inicial sample-rate/canales: IMPLEMENTADO;
- corrección continua basada en relojes físicos: PENDIENTE.

Lip-sync:
- contrato de boca/avatar: IMPLEMENTADO;
- alimentación por audio real: PENDIENTE.

### P4 — RTMP, reconexión, hardware

**Estado:** PENDIENTE.

RTMP:
- perfil directo RTMP/RTMPS: IMPLEMENTADO;
- envío real sostenido contra plataforma: PENDIENTE.

Reconexión:
- clasificación de fallos: IMPLEMENTADO;
- política exponencial acotada: IMPLEMENTADO;
- integración de reintento RTMP en runtime: IMPLEMENTADO/EXPERIMENTAL;
- verificación real de reconexión: PENDIENTE.

Hardware:
- prueba CI Windows: PENDIENTE;
- prueba en PC objetivo: PENDIENTE.

### P5 — Packaging / distribución legal

**Estado:** PENDIENTE.

Ya existe:
- ZIP portable x64 generado por workflow.

Falta:
- decisión de redistribución FFmpeg/codec;
- bundle de dependencias;
- instalador;
- logs/diagnóstico de usuario;
- release smoke test.

---

# Registro cronológico

## 2026-09-20 — Endurecimiento del pipeline A/V

### Cambios completados

1. **Interleaver global A/V**
   - Archivo: `experimental/studio/core/media_scheduler.h`
   - Archivo: `experimental/studio/core/media_scheduler_smoke.cpp`
   - Resultado: VERIFICADO.
   - Comportamiento: selecciona el menor PTS entre audio/video; empate favorece audio.

2. **Formato de audio invariante durante output**
   - Archivo: `experimental/studio/native-windows/media_graph_controller.*`
   - Resultado: IMPLEMENTADO.
   - Rechaza cambio de sample rate/canales durante una sesión.
   - Métrica: `audio_dropped_format`.

3. **Backpressure de arranque**
   - Archivo: `experimental/studio/native-windows/main.cpp`
   - Resultado: IMPLEMENTADO.
   - El mixer no drena audio hasta que ambos pipes están conectados.

4. **Límite de despacho por tick**
   - Archivo: `experimental/studio/native-windows/media_graph_controller.*`
   - Límite: 8 eventos A/V por polling.
   - Métrica: `pacing_budget_exhausted`.
   - Resultado: IMPLEMENTADO.

5. **Protección de sesión**
   - Archivo: `experimental/studio/native-windows/main.cpp`
   - Resultado: IMPLEMENTADO.
   - No se permite detener/cambiar captura o audio durante un output activo.

6. **Diagnóstico FFmpeg**
   - Estado/código de salida expuestos.
   - stderr limitado a 256 KiB.
   - Resultado: IMPLEMENTADO.

7. **Clasificación de errores**
   - Archivo: `experimental/studio/core/output_diagnostics.h`
   - Categorías: network / encoder / input / mux / permission / unknown.
   - Resultado: IMPLEMENTADO.
   - Regla: solo network es candidato a retry automático.

8. **Política de retry**
   - Archivo: `experimental/studio/core/output_retry.h`
   - Backoff: 1 s → 2 s → 4 s ... hasta 30 s.
   - Máximo: 5 intentos.
   - Resultado: IMPLEMENTADO.
   - Smoke test: creado.

9. **Retry RTMP protegido**
   - Archivo: `experimental/studio/native-windows/main.cpp`
   - Solo conserva/reintenta RTMP.
   - Fallos encoder/mux/input/permission no se reintentan a ciegas.
   - Resultado: EXPERIMENTAL; falta validación real.

10. **CI de desarrollo**
    - Workflows configurados para la rama `fix/native-windows-foundation`.
    - Añadido `workflow_dispatch`.
    - Resultado: IMPLEMENTADO.
    - Problema actual: runners terminan con `steps=null` antes de ejecutar pruebas.

---

# Evidencia automatizada existente

## C++ portable

- Control protocol smoke: PASS.
- MediaClock smoke: PASS.
- Media scheduler/interleaver smoke: PASS.
- Output retry smoke: PASS.
- Output diagnostics smoke: PASS.

## JavaScript

- Session/avatar contract tests: PASS en ejecución previa documentada.
- Face tracking timestamp guard integrado.

## FFmpeg

- Prueba sintética FFmpeg 7.1.5:
  `BGRA raw + PCM float32 → H.264/AAC → Matroska`
  Resultado: PASS.

Limitación:
- ejecutada en Linux;
- no sustituye Windows named pipes;
- no sustituye captura real;
- no sustituye hardware;
- no sustituye RTMP real.

---

# CI: evidencia y no-repetición

Runs recientes:
- Native Windows Build: failure con `steps=null`;
- CI: failure/cancelled con `steps=null`;
- Character Runtime Tests: failure/cancelled con `steps=null`.

Acción ya realizada:
- reintentos de los runs previos;
- modificación de triggers para la rama de desarrollo;
- nuevos runs vuelven a fallar antes de registrar steps.

Conclusión:
- NO se atribuye una línea del proyecto a estos fallos;
- NO se marca CI como verde;
- NO repetir reintentos idénticos sin cambiar la evidencia disponible.

---

# Elementos deliberadamente NO resueltos

1. PTS explícitos dentro del transporte raw.
2. Compositor GPU D3D11 de producción.
3. Integración avatar → frame codificado.
4. Cámara Media Foundation streaming real.
5. Game Capture dedicada.
6. Drift correction de relojes físicos.
7. Lip-sync alimentado por audio real.
8. RTMP sostenido contra servicio real.
9. Reconexión real validada.
10. Validación exhaustiva en PC objetivo.
11. Live2D runtime real.
12. Multistream.
13. FFmpeg/codec redistribution.
14. Instalador.
15. Diagnóstico/logging de usuario de producción.

---

# Intentos descartados / no repetir

## FIFO E2E inicial
- Se intentó una prueba con dos FIFOs.
- Resultado: expiró por el comportamiento de apertura/bloqueo de los FIFOs.
- Se sustituyó para validación contractual por archivos raw sintéticos con FFmpeg.
- No repetir el mismo experimento sin modificar la sincronización de apertura/handshake.

## Promoción prematura del compositor software
- No se considera compositor de producción.
- Mantener como referencia/diagnóstico hasta P1.

## Suposición de timestamps
- Los PTS se usan para scheduling.
- Los pipes raw no los transportan.
- No considerar resuelto P2.

---

# Regla para futuras iteraciones

Antes de implementar una tarea:

1. buscarla en este archivo;
2. comprobar `AUDIT_MATRIX.md`;
3. reutilizar pruebas existentes;
4. cambiar solo lo que tenga una evidencia pendiente;
5. registrar el resultado aquí;
6. si falla por infraestructura, documentar el bloqueo sin duplicar cambios equivalentes.

# Estado global

**Avance de ingeniería estimado: 58%.**

La cifra se basa en el conjunto de subsistemas y gates, no en cantidad de archivos o líneas de código.

**Estado del producto:** base Windows/Electron funcional y fuertemente instrumentada, todavía experimental para streaming/VTubing de producción.
