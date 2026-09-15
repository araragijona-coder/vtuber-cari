# Cari Studio — estado de implementación

## Arquitectura

- [x] Núcleo local sin IA/API obligatoria.
- [x] Contratos de fuente, frame y audio.
- [x] Colas acotadas con métricas de descarte.
- [x] Escenas y capas ordenadas.
- [x] Mixer de audio lógico.
- [x] Frontera de encoder y salida.
- [x] Monitoring y clasificación de salud.
- [x] Smoke test nativo y CI Windows.

## Windows

- [x] Win32 window foundation.
- [x] D3D11 device creation.
- [x] Windows Graphics Capture de ventana.
- [x] Frame callback con superficie DXGI.
- [x] Enumeración de ventanas capturables.
- [x] WASAPI microphone/loopback foundation.
- [ ] Captura de cámara real mediante Media Foundation.
- [ ] Game Capture dedicada con backend específico.
- [ ] Device-loss/reconnect exhaustive handling.

## Multimedia

- [x] Compositor RGBA de referencia para validar escenas.
- [x] Fan-out conceptual de múltiples salidas.
- [x] Perfil de salida y boundary de FFmpeg/RTMP.
- [ ] Compositor GPU D3D11 de producción.
- [ ] Encoder hardware/software real conectado al pipeline.
- [ ] Muxer/recorder de producción.
- [ ] Proceso FFmpeg administrado por Cari.

## VTuber / cámara / voz

- [x] Contratos de avatar y actuación existentes.
- [x] Renderer VRM experimental web existente.
- [ ] Render VRM integrado al compositor nativo.
- [ ] Lip-sync alimentado por audio real.
- [ ] Tracking/cámara final.
- [ ] Procesamiento de voz local de baja latencia.

## Streaming / eventos

- [x] Arquitectura de salida desacoplada de plataformas.
- [ ] Adaptador Twitch RTMP probado en máquina real.
- [ ] Adaptador YouTube RTMP probado en máquina real.
- [ ] Adaptadores adicionales.
- [x] Twitch chat con un único EventSub WebSocket compartido.
- [x] Comandos locales antes del pipeline de IA opcional.
- [x] EventSub follow, subscribe, gifted sub, resub message, cheer, raid, channel points, polls y predictions conectado al AutomationEngine.
- [x] Despachador local de acciones de avatar/voz sin IA.
- [ ] Chat de salida, sonidos y cambios de escena desde reglas de automatización.
- [ ] Multi-stream real con límites y reconexión.

## Distribución

- [ ] Perfil reproducible Release x64.
- [ ] Bundle de assets.
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
