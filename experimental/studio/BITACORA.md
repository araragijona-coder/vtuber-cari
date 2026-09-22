# BITÁCORA — Cari Studio

Fuente de continuidad rápida. El registro detallado está en ENGINEERING_LOG.md.

## Corte 2026-09-22
- Estado global de ingeniería: ~58%.
- Rama: fix/native-windows-foundation.
- PR: #2.
- Staging de assets creado en webapp/assets/scavenged_art/.
- ASSET_MANIFEST.json creado con provenance y estado de licencia.
- ENGINEERING_LOG.md consolidado como registro detallado.
- Política de retry/backoff para RTMP implementada, limitada a fallos clasificados como network.
- Clasificación estructurada de fallos de output implementada.
- Métricas de retry/categoría expuestas.
- Serialización del campo output corregida.
- Clasificación network estrechada para evitar reintentos falsos.
- Smoke tests de retry/diagnostics registrados en CMake; ejecución final Windows aún pendiente de evidencia CI válida.

## Regla
No repetir componentes marcados VERIFICADO. Priorizar PENDIENTE y NO VALIDADO EN HARDWARE.

## Corte adicional — backlog punto 10
- IMPLEMENTADO: `webapp/js/scavenged/canvas/combat.js` como renderer Canvas ligero y modular.
- IMPLEMENTADO: política de carga estricta: solo assets con `status` verificado y `local_path` son elegibles.
- IMPLEMENTADO: caché `ImageBitmap`, `requestAnimationFrame`, límite de DPR a 2 y FPS configurable 15–60.
- IMPLEMENTADO: fondos, tarjetas y HUD preparados para la paleta #8b00ff / #ff1a1a.
- BLOQUEADO DELIBERADAMENTE: importación física de binarios; el manifest actual marca sus candidatos como `candidate-review`/`catalog-only`, no como `verified`, y no se importan por estética.
- NO REPETIR: no volver a implementar un loader genérico de assets; el siguiente trabajo debe ser provenance + binarios físicamente verificables o continuar con el punto 11.

## Siguiente foco
1. Ejecutar smoke retry/diagnostics.
2. End-to-end FFmpeg Windows/named pipes.
3. Avatar -> compositor GPU -> frame FFmpeg.
4. Camera/Game Capture.
5. RTMP real/reconnect.
6. Drift correction.
7. Lip-sync.
8. Assets con provenance verificada.
