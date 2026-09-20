# Cari Studio — estado de implementación

## Arquitectura

- [x] Núcleo local sin IA/API obligatoria.
- [x] Contratos de fuente, frame y audio.
- [x] Colas acotadas con métricas de descarte.
- [x] Escenas y capas ordenadas.
- [x] Mixer de audio lógico.
- [x] Frontera de encoder y salida.
- [x] OutputRetryPolicy y clasificación de fallos para RTMP.
- [x] Monitoring y clasificación de salud.
- [x] Cola temporal A/V con reloj maestro lógico de audio.
- [x] Emisión raw temporizada por PTS con `RealtimePacer` y colas acotadas.
- [x] Interleaver A/V global por PTS con prioridad determinista de audio en empate.
- [x] Compositor D3D11 experimental conectado al frame final mediante readback BGRA.
- [x] Readback de captura CPU lazy: solo diagnóstico/fallback; no se ejecuta antes de cada composición GPU.
- [x] Diagnóstico de salida FFmpeg con estado/código de salida y buffer stderr acotado.
- [x] Retry/backoff RTMP restringido a errores de red y métricas de categoría.
- [x] Reset de retry por nueva sesión manual, conservando intentos durante reconexiones automáticas.
- [x] Backpressure de arranque: el mixer no drena audio hasta que ambos pipes de salida están conectados.
- [x] Límite de despacho por polling para impedir ráfagas largas de recuperación A/V dentro de un solo tick.
- [x] Latest-frame worker fuera del callback WGC: el callback solo encola/reemplaza frames pendientes; el procesamiento pesado queda desacoplado del hilo de captura.
- [x] Diagnóstico y retry RTMP acotado por categoría de fallo.
- [x] Smoke end-to-end Windows de FFmpeg + named pipes implementado en código; **PENDIENTE DE VERIFICACIÓN** porque GitHub Actions no expone steps/logs ejecutados.
- [x] Política de retry RTMP con backoff exponencial acotado y clasificación de errores.
- [x] Bitácora maestra con ledger de trabajo realizado, descartado y pendiente.
- [x] Auditoría de licencias de dependencias runtime fijadas.
  - No habilita por sí sola redistribución de FFmpeg/codec; esa decisión sigue pendiente.
- [x] Smoke test nativo para contratos core.
- [x] Smoke D3D11 compositor con WARP, incluyendo composición alpha de overlay.
- [x] Reconstrucción del compositor ante cambio de ID3D11Device después de device-loss recovery.
- [ ] CI Windows verde sobre el head actual (los últimos runs siguen fallando antes de registrar steps; el nuevo workflow ya incluye instalación de FFmpeg y gates e2e para cuando el runner ejecute jobs normalmente).

## Windows

- [x] Win32 window foundation.
- [x] D3D11 device creation.
- [x] Windows Graphics Capture de ventana.
- [x] Windows Graphics Capture de pantalla primaria.
- [x] Frame callback con superficie DXGI.
- [x] Enumeración de ventanas capturables.
- [x] WASAPI microphone/loopback foundation.
- [x] Recreación del frame pool ante cambios de tamaño.
- [x] Módulo de captura de cámara Media Foundation implementado.
  - [x] Integración al runtime/control plane/UI como source=camera.
  - [ ] Validación en cámara real y reconexión en Windows.
- [ ] Game Capture dedicada con backend específico.
- [x] Recuperación explícita de device removed/reset/hung.
- [ ] Validación exhaustiva de device-loss/reconnect en hardware real.

## Multimedia

- [x] Compositor RGBA de referencia para validar escenas.
- [x] Fan-out conceptual de múltiples salidas.
- [x] Productor BGRA y audio mezclado conectados al boundary nativo de FFmpeg.
- [x] Perfil de salida y boundary de FFmpeg/RTMP.
- [x] Interleave temporal A/V en `StudioPipeline`.
- [x] Compositor D3D11 GPU experimental para captura + avatar-placeholder + overlays.
- [ ] Compositor GPU D3D11 de producción conectado al encoder.
- [ ] Encoder hardware/software real conectado al pipeline.
- [ ] Muxer/recorder de producción.
- [x] Proceso FFmpeg administrado por Cari y conectado a las salidas.
  - El cierre intenta primero EOF/flush antes de escalar a terminación forzada.
  - Se añadieron clasificación de fallos y retry exponencial limitado para RTMP de red.
  - El diagnóstico stderr queda limitado a 256 KiB para impedir crecimiento indefinido durante sesiones largas.
  - El estado/código de salida del proceso se publica en las métricas nativas y en la UI.
  - El cierre intenta primero EOF/flush antes de escalar a terminación forzada.
  - El estado nativo se reconcilia si FFmpeg termina inesperadamente.
  - El gate de verificación real sigue abierto: archivo/RTMP sostenido, sincronización, reconexión y hardware.
- [x] Estimator independiente de drift de reloj de audio implementado.
  - [ ] Corrección/resampling de producción con relojes físicos.
- [ ] Verificación sostenida del pacing A/V con FFmpeg real.
  - E2E sintético de named pipes reforzado a 5 s y listo para CI; la validación sigue bloqueada mientras Actions no ejecute steps.
- [ ] Verificación Windows del E2E named-pipe y del compositor D3D11.
- [x] Ruta Libav experimental para preservar PTS explícitos.
  - [ ] Compilación/verificación con kit de desarrollo FFmpeg en Windows.
- [ ] Verificación Windows real del named-pipe E2E.
  - Existe ahora un smoke Windows que ejerce ambos named pipes durante una sesión sintética y vuelve a decodificar el archivo resultante.
  - La planificación ahora interleavea globalmente por PTS; el transporte raw todavía no conserva los PTS originales.

## VTuber / cámara / voz

- [x] Contratos de avatar y actuación existentes.
- [x] Contrato normalizado de expresión/pose/gaze para renderer Three.js.
- [x] Estado de actuación independiente de apariencia.
- [x] Perfil de apariencia modular con cabello, outfit y accesorios.
- [x] Accesorios con ancla, posición, escala, rotación y color.
- [x] Selección aleatoria reproducible de accesorios.
- [x] Renderer Three.js/glTF experimental con fallback de cuerpo completo.
- [x] Fallback Three.js de cuerpo completo para validación de tracking/composición; ya no es un placeholder de solo cabeza.
- [x] Overlay Three.js/glTF integrado experimentalmente al compositor nativo mediante la ventana transparente capturada con WGC.
- [ ] Integración de avatar de producción sin readback CPU.
- [x] Lip-sync local por amplitud del audio mezclado cuando MediaPipe no está conduciendo `mouthOpen`.
- [ ] Tracking/cámara final.
  - MediaPipe Face Landmarker está integrado como adaptador local; falta validación final de rendimiento y modelo real.
- [x] Cadena de voz local de baja latencia: HPF + presencia + compresión + saturación suave + limitador.
  - [ ] Validación integrada en Windows y medición sostenida.

## Streaming / eventos

- [x] Arquitectura de salida desacoplada de plataformas.
- [ ] Adaptador Twitch RTMP probado en máquina real.
- [ ] Adaptador YouTube RTMP probado en máquina real.
- [ ] Adaptadores adicionales.
- [x] Twitch chat con un único EventSub WebSocket compartido.
- [x] Comandos locales antes del pipeline de IA opcional.
- [x] Chat normal pasivo por defecto: no invoca IA/Responder.
- [x] Chat público `1+` con TTS local y evento `chat_read`.
- [x] Guardia local de salida del chat contra ráfagas.
- [x] EventSub follow, subscribe, gifted sub, resub message, cheer, raid, channel points, polls y predictions conectado al AutomationEngine.
- [x] Despachador local de acciones de avatar/voz sin IA.
- [x] Acciones `chat/sound/scene/overlay/music` no se pierden silenciosamente: se publican como `studio_action` para el runtime.
- [x] `StudioActionRouter` valida y traduce `studio_action` a eventos internos tipados.
- [x] `StudioActionRouter` queda conectado al `LocalPipeline`.
- [x] `StudioRuntimeBindings` permite registrar backends locales con métricas y aislamiento de errores.
- [x] Acciones desconocidas generan `automation_action_unhandled` para auditoría.
- [ ] Ejecutar realmente `studio_chat_requested`, `studio_sound_requested`, `studio_scene_requested` y equivalentes con los backends nativos.
- [x] Supervisor multi-stream experimental con hasta 4 destinos y retry independiente por destino.
  - [ ] Validación con múltiples endpoints RTMP reales.
- [x] Observabilidad de continuidad EventSub con ledger de generaciones y auditoría de suscripciones.
  - [ ] Prueba real de reconexión/re-suscripción con Twitch CLI o canal.

## Avatar Studio

- [x] Base de configuración separada del stream en directo.
- [x] Modelo de apariencia intercambiable sin tocar el estado de actuación.
- [x] Puntos de anclaje para accesorios.
- [x] Randomización de accesorios con semilla reproducible.
- [x] Persistencia de presets JSON con validación de versión y nombres seguros.
- [ ] Editor visual de escritorio.
- [ ] Catálogo real de assets aprobado por el usuario.
- [ ] Previsualización VRM integrada.
- [ ] Guardado/carga de presets desde UI.

## Distribución

- [x] Workflow reproducible de compilación Release x64 en Windows CI.
- [x] Paquete portable x64 generado por CI como artifact.
- [ ] Bundle de assets de producción y modelo artístico final.
- [ ] FFmpeg/codec legalmente redistribuible elegido.
- [x] Configuración del instalador NSIS x64.
- [ ] Validación del instalador Windows en máquina/CI y firma.
- [ ] Diagnóstico/rollback y logs de usuario.

## Estimación de avance

**Estimación global de ingeniería: ~65%.**

Este porcentaje mide cierre de requisitos de ingeniería; no equivale a porcentaje de código ni a disponibilidad para producción.

## Criterio de cierre

Un componente no se marca como completo por tener una interfaz. Debe:

1. compilar en Windows CI cuando corresponda;
2. tener smoke/unit/integration coverage apropiada;
3. funcionar con el hardware objetivo cuando sea hardware-dependent;
4. exponer métricas y errores útiles;
5. no convertir una integración opcional en dependencia obligatoria.

## Regla de reutilización

Cari estudia proyectos maduros y reutiliza librerías/componentes cuando sus licencias y límites de distribución sean compatibles. Para código con licencia incompatible, se adopta el patrón arquitectónico y se implementa una versión propia.


## Continuidad / bitácora

La única fuente canónica de continuidad y anti-repetición es `BITACORA.md`.

- HEAD canónico: consultar el HEAD actual del PR #2 y `BITACORA.md`
- Avance de ingeniería vigente: **65%**.
- Avance de producto usable vigente: **50%**.
- Los checkpoints anteriores son históricos y no deben usarse para decidir trabajo nuevo.

### Regla
Antes de modificar un componente, buscarlo en `BITACORA.md`. Si está IMPLEMENTADO/VERIFICADO, trabajar sobre su gate restante o sobre una regresión reproducible; no crear un reemplazo paralelo.

## Readiness

**Estado de uso actual: NO listo para producción.**

El proyecto tiene un build experimental con los componentes principales implementados, pero la validación Windows/hardware sigue abierta. La ausencia de jobs con steps/logs en GitHub Actions impide marcar el build nativo como verificado en CI.

**Build de desarrollo:** sí, una vez compilado en Windows y usado bajo prueba controlada.

**Streamer/VTuber estable para uso diario:** todavía no.

**Gate inmediato:** ejecutar y obtener PASS del E2E Windows named-pipe -> FFmpeg -> archivo y del build completo; después medir estabilidad sostenida y sincronización.

- [x] Harness local `validate-windows.ps1` para ejecutar build, smoke/E2E y checks de Electron con evidencia reproducible.

## Indicador de producto usable

El porcentaje de ingeniería y el porcentaje de producto listo para uso real se separan para evitar confundir infraestructura con experiencia de usuario.

- **Ingeniería implementada: ~65%**.
- **Producto usable/end-user: ~50%**.

Producto usable todavía requiere: prueba Windows real, Twitch real, RTMP sostenido, modelo artístico final, composición avatar→encoder, cámara final, Game Capture, drift correction, lip-sync, distribución FFmpeg y validación del PC objetivo.

## User-facing readiness update

- Twitch OAuth + EventSub chat está conectado al desktop shell con UI de conexión, chat entrante, envío y lectura local.
- Avatar GLB/glTF tiene selector y framing de cuerpo completo.
- Instalador NSIS x64 y launchers están definidos.
- La validación real del servicio/hardware continúa abierta.
