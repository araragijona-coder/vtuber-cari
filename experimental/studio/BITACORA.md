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

## Siguiente foco
1. Ejecutar smoke retry/diagnostics.
2. End-to-end FFmpeg Windows/named pipes.
3. Avatar -> compositor GPU -> frame FFmpeg.
4. Camera/Game Capture.
5. RTMP real/reconnect.
6. Drift correction.
7. Lip-sync.
8. Assets con provenance verificada.
