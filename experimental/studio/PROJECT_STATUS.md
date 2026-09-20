# Cari Studio — estado de implementación

## Arquitectura

- [x] Núcleo local sin IA/API obligatoria.
- [x] Contratos de fuente, frame y audio.
- [x] Colas acotadas con métricas de descarte.
- [x] Escenas y capas ordenadas.
- [x] Mixer de audio lógico.
- [x] Frontera de encoder y salida.
- [x] Monitoring y clasificación de salud.
- [x] Cola temporal A/V con reloj maestro lógico de audio.
- [x] Emisión raw temporizada por PTS con `RealtimePacer` y colas acotadas.
- [x] Interleaver A/V global por PTS con prioridad determinista de audio en empate.
- [x] Diagnóstico de salida FFmpeg con estado/código de salida y buffer stderr acotado.
- [x] Smoke test nativo para contratos core.
- [ ] CI Windows verde sobre el head actual (los runs recientes fallan con `steps=null` antes de registrar steps; requiere nueva evidencia del runner).

## Windows

- [x] Win32 window foundation.
- [x] D3D11 device creation.
- [x] Windows Graphics Capture de ventana.
- [x] Windows Graphics Capture de pantalla primaria.
- [x] Frame callback con superficie DXGI.
- [x] Enumeración de ventanas capturables.
- [x] WASAPI microphone/loopback foundation.
- [x] Recreación del frame pool ante cambios de tamaño.
- [ ] Captura de cámara real mediante Media Foundation.
- [ ] Game Capture dedicada con backend específico.
- [x] Recuperación explícita de device removed/reset/hung.
- [ ] Validación exhaustiva de device-loss/reconnect en hardware real.

## Multimedia

- [x] Compositor RGBA de referencia para validar escenas.
- [x] Fan-out conceptual de múltiples salidas.
- [x] Productor BGRA y audio mezclado conectados al boundary nativo de FFmpeg.
- [x] Perfil de salida y boundary de FFmpeg/RTMP.
- [x] Interleave temporal A/V en `StudioPipeline`.
- [ ] Compositor GPU D3D11 de producción.
- [ ] Encoder hardware/software real conectado al pipeline.
- [ ] Muxer/recorder de producción.
- [x] Proceso FFmpeg administrado por Cari y conectado a las salidas.
  - El diagnóstico stderr queda limitado a 256 KiB para impedir crecimiento indefinido durante sesiones largas.
  - El estado/código de salida del proceso se publica en las métricas nativas y en la UI.
  - El cierre intenta primero EOF/flush antes de escalar a terminación forzada.
  - El estado nativo se reconcilia si FFmpeg termina inesperadamente.
  - El gate de verificación real sigue abierto: archivo/RTMP sostenido, sincronización, reconexión y hardware.
- [ ] Drift correction / resampling de producción.
- [ ] Verificación sostenida del pacing A/V con FFmpeg real.
  - La planificación ahora interleavea globalmente por PTS; el transporte raw todavía no conserva los PTS originales.

## VTuber / cámara / voz

- [x] Contratos de avatar y actuación existentes.
- [x] Contrato normalizado de expresión/pose/gaze para renderer Three.js.
- [x] Estado de actuación independiente de apariencia.
- [x] Perfil de apariencia modular con cabello, outfit y accesorios.
- [x] Accesorios con ancla, posición, escala, rotación y color.
- [x] Selección aleatoria reproducible de accesorios.
- [x] Renderer VRM experimental web existente.
- [ ] Render VRM integrado al compositor nativo.
- [ ] Lip-sync alimentado por audio real.
- [ ] Tracking/cámara final.
  - MediaPipe Face Landmarker está integrado como adaptador local; falta validación final de rendimiento y modelo real.
- [ ] Procesamiento de voz local de baja latencia.

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
- [ ] Multi-stream real con límites y reconexión.
- [ ] Reconexión EventSub explícita auditada contra el ciclo welcome/keepalive/reconnect de Twitch.

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
- [ ] Bundle de assets de producción.
- [ ] FFmpeg/codec legalmente redistribuible elegido.
- [ ] Instalador Windows.
- [ ] Diagnóstico/rollback y logs de usuario.

## Criterio de cierre

Un componente no se marca como completo por tener una interfaz. Debe:

1. compilar en Windows CI cuando corresponda;
2. tener smoke/unit/integration coverage apropiada;
3. funcionar con el hardware objetivo cuando sea hardware-dependent;
4. exponer métricas y errores útiles;
5. no convertir una integración opcional en dependencia obligatoria.

## Regla de reutilización

Cari estudia proyectos maduros y reutiliza librerías/componentes cuando sus licencias y límites de distribución sean compatibles. Para código con licencia incompatible, se adopta el patrón arquitectónico y se implementa una versión propia.
