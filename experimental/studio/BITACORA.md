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

## LOG-056 — 2026-09-22 — Scavenger Protocol: mecánicas web ligeras

### Hecho
- Investigación de prototipos/juegos web con JavaScript/Canvas sin dependencias pesadas.
- Se estudiaron patrones de combate por turnos/críticos, selección de objetivos, partículas y delta-time.
- Se creó `webapp/js/scavenged/` con implementaciones originales:
  - `combat-engine.js`
  - `target-selector.js`
  - `impact-particles.js`
  - `arcade-loop.js`
  - `index.js`
  - `README.md`
- Las implementaciones no copian código fuente; adaptan patrones generales.
- Se creó `experimental/studio/DEV_LOG.md` como bitácora operativa adicional.

### Fuentes conceptuales consultadas
- Rolling Scopes School — Not Fight Club: combate turn-based, ataque/defensa y críticos.
- Asteroids Redux — Canvas vanilla, colisiones y limpieza de partículas.
- Bubble Panic — partículas, delta-time y arquitectura de estados.
- Space Shooter — Canvas sin dependencias y partículas.
- RouteLab — selección determinista de objetivos.

### No repetir
- No volver a investigar desde cero el núcleo de críticos/mitigación, selector de objetivo por pointer, partículas básicas Canvas ni delta-time loop para este módulo.
- No añadir React/Vue/Three.js a este frente.
- No reabrir WGC/WASAPI/OBS/Twitch/timing del Studio por este trabajo.

### Gate pendiente
- La rama accesible es `araragijona-coder/vtuber-cari`; no contiene una Mini App Telegram real. Por tanto, el módulo queda aislado y **NO integrado** a una UI Telegram.
- Falta test de navegador/móvil y conexión al estado de batalla real cuando exista ese frontend.
- No marcar este módulo como "producción" solo por existir el código.

### Estado
- IMPLEMENTADO: 6 archivos del módulo.
- VERIFICADO: revisión estática de estructura y exports.
- VALIDADO EN NAVEGADOR/MÓVIL: pendiente.
