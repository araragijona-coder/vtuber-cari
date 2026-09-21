> **ARCHIVO HISTÓRICO / NO CANÓNICO.** La fuente oficial de continuidad y anti-repetición es `experimental/studio/BITACORA.md`. No usar el porcentaje de este archivo para decidir trabajo nuevo.

# Cari Studio — Bitácora de continuidad

> Objetivo: impedir trabajo duplicado. Antes de implementar una pieza, revisar esta bitácora y sus estados.
> Estados: **IMPLEMENTADO** = código integrado; **VERIFICADO** = prueba técnica ejecutada; **VALIDADO EN HARDWARE** = probado en Windows/PC objetivo.

## Estado global

**Estimación de ingeniería actual: ~67%.**

El porcentaje es una estimación de avance técnico, no una medición de líneas de código. No se considera terminado ningún bloque grande solo porque compile.

## Arquitectura decidida

- Cari Studio es la aplicación/controlador principal.
- OBS puede actuar como **conductor de emisión**: Cari Studio controla OBS mediante obs-websocket; OBS se encarga del pipeline final de emisión/recording cuando se elige ese modo.
- Cari Studio conserva fuera de OBS la UI, VTuber/avatar, tracking facial, acciones, chat, eventos, automatizaciones y configuración.
- El Native Engine es el backend principal de ejecución; OBS es un backend/adaptador opcional para funciones que Cari decida delegar.
- Twitch y otros servicios se integran mediante adaptadores independientes; no se mezclan credenciales ni lógica de Twitch con el motor multimedia nativo.
- Las piezas dudosas permanecen en `experimental/` hasta validación.

## OBS — historial y estado

### IMPLEMENTADO
- Cliente `obs-websocket-js` 5.x.
- Conexión configurable `ws://127.0.0.1:4455` / `wss://...`.
- Autenticación mediante password.
- Start/Stop Stream.
- Start/Stop Recording.
- Virtual Camera.
- Escenas program/preview.
- Studio Mode + transición.
- Lista de escenas.
- Lista de inputs/sources.
- Input kinds.
- Stats de OBS.
- Profiles.
- Scene Collections.
- Eventos de estado: stream, record, virtual camera, escena y Studio Mode.
- IPC Electron con wrappers explícitos y sender validation.

### NO REPETIR
No volver a implementar un cliente OBS básico ni volver a crear Start/Stop Stream, escenas, perfiles o Virtual Camera salvo que una auditoría encuentre un bug concreto.

### PENDIENTE
- Descubrimiento/configuración guiada de OBS desde Cari Studio.
- Diagnóstico de versión/protocolo.
- Reconexión/backoff del cliente OBS.
- Prueba real con OBS instalado en Windows.
- Sincronización de scene/source graph cuando OBS cambia externamente.
- Gestión segura de credenciales persistentes.

## Twitch — historial y estado

### IMPLEMENTADO
- Arquitectura separada `TwitchAuth` + `TwitchChatService` + API.
- WebSocket/EventSub preparado.
- Estado Twitch expuesto por IPC.
- Recepción de chat y eventos.
- Envío de mensajes de chat.
- UI de chat/eventos existente.
- Eventos puenteados hacia renderer.
- Acciones de avatar disparables por comandos/eventos.

### PATRÓN OFICIAL ADOPTADO
Twitch recomienda actualmente EventSub + Twitch API para chat; IRC queda como interfaz histórica/limitada. EventSub WebSocket usa `wss://eventsub.wss.twitch.tv/ws`, entrega un `session_welcome` y requiere suscripciones asociadas al `session_id`. 

### NO REPETIR
No construir un IRC parser nuevo como camino principal.
No mezclar EventSub con la capa nativa de audio/video.
No guardar client secret/tokens en el renderer.

### PENDIENTE
- OAuth completo y almacenamiento seguro de tokens.
- Renovación/revocación de tokens.
- Suscripciones EventSub declarativas por feature.
- Dedupe por `message_id`.
- Reconexión usando `reconnect_url` cuando Twitch lo indique.
- Backoff y recuperación de EventSub.
- Validación real con canal Twitch.
- Matriz de scopes mínima por función.

## Motor multimedia nativo

### IMPLEMENTADO
- Windows Graphics Capture.
- Captura de ventana y pantalla.
- D3D11.
- WASAPI micrófono + system loopback.
- VoiceEffectProcessor anime-bright.
- AudioTimelineMixer.
- FrameBridge.
- MediaClock.
- RealtimePacer.
- Interleaver global A/V por PTS.
- Bounded queues.
- Backpressure de arranque.
- Límite de 8 eventos A/V por polling.
- RawPipe.
- FFmpeg supervisor.
- Grabación local y RTMP/RTMPS experimental.
- Diagnóstico de estado, exit code y métricas.
- Clasificación de fallos de output.
- Política de retry RTMP acotada y solo para fallos clasificados como red.

### VERIFICADO
- Smoke C++20 con `-Wall -Wextra -Werror` para contratos portables.
- MediaClock + RealtimePacer + interleaver.
- FFmpeg sintético BGRA + PCM float32 -> H.264/AAC -> Matroska.

### NO REPETIR
No volver a crear otro scheduler/pacer/interleaver sin evidencia de un defecto.
No volver a convertir la captura nativa en OpenCV solo por similitud conceptual: Windows Graphics Capture/D3D11 es la ruta primaria.

### PENDIENTE
- PTS originales extremo a extremo a través del transporte raw.
- Drift correction de relojes físicos.
- FFmpeg sostenido con named pipes en Windows.
- RTMP real prolongado.
- Reconexión real contra servidor.
- Clasificación de stderr más robusta y basada en códigos/contexto.
- GPU compositor D3D11 de producción.
- Game Capture.
- Cámara Media Foundation.
- Hardware validation en PC objetivo.

## Avatar / tracking

### IMPLEMENTADO
- FaceLandmarker MediaPipe.
- Guard de timestamps monotónicos.
- FaceTrackingBridge.
- Avatar contract con clamping.
- Acting bridge.
- Three.js WebGL renderer.
- GLB/glTF loader.
- Placeholder geometry.
- Selección de modelo local.
- Overlay transparente separado.
- Comunicación de estado avatar mediante IPC.
- Live2D mantenido como adapter-only.

### NO REPETIR
No generar un modelo propietario de Cari.
No sustituir el contrato de avatar por lógica específica de un único modelo.
No introducir Live2D runtime propietario en el core sin revisar distribución/licencia.

### PENDIENTE
- Composición del avatar dentro del frame final.
- GPU compositor real.
- Lip-sync robusto.
- Performance sustained.
- Prueba con modelos GLB reales.
- Adaptador Live2D opcional.
- Integración de tracking con salida codificada.

## CI / release

### IMPLEMENTADO
- CMake C++20 estricto.
- Smoke tests.
- Workflow Native Windows.
- Workflow Character Runtime.
- CI general.
- Packaging ZIP/NSIS preparado.
- Checks Node/ESM.

### ESTADO ACTUAL
Los últimos problemas de Actions observados mostraron fallos/cancelaciones antes de steps útiles (`steps=null`); por eso **no se declara CI verde** sin una ejecución real con logs.

### PENDIENTE
- CI Windows verde y reproducible.
- Instalación de dependencias de runtime.
- FFmpeg redistribuible/licencia/documentación.
- Instalador final.
- Firma de binarios.
- Prueba de instalación limpia.

## Intentos descartados / no repetir

1. **Rehacer OBS desde cero:** descartado. OBS debe poder ser conductor de emisión.
2. **Hacer depender todo de OBS:** descartado. Cari Studio mantiene arquitectura propia.
3. **Meter IA en el funcionamiento normal:** descartado. El core no depende de IA/cloud.
4. **Usar OpenCV como sustituto de Windows Graphics Capture:** descartado para captura principal; puede existir como utilidad de cámara/preprocesamiento si aporta valor.
5. **Transportar PTS reales por raw pipe sin protocolo adicional:** aún no resuelto; el pacing actual no equivale a preservación exacta de timestamps.
6. **Declarar CI verde por existencia del workflow:** descartado.
7. **Reintentar automáticamente cualquier fallo FFmpeg:** descartado; solo se permite retry para categorías de red.
8. **Componer el avatar mediante capturas periódicas de la ventana Electron:** no se considera solución final de producción.

## Próxima cola priorizada

1. Validar/terminar cliente OBS: reconnect + diagnóstico + sync de estado.
2. Terminar Twitch OAuth/EventSub lifecycle + dedupe/reconnect.
3. Diseñar compositor GPU D3D11 avatar + captura.
4. Hacer prueba Windows real FFmpeg/named pipes.
5. Integrar PTS explícitos en transporte.
6. Drift correction.
7. Lip-sync.
8. Game Capture/cámara.
9. Multistream.
10. Instalador/release/hardware validation.

## Regla de continuidad

Antes de tocar una pieza:
1. Buscarla en esta bitácora.
2. Si está **IMPLEMENTADO**, auditar antes de reescribir.
3. Si está **VERIFICADO**, ampliar pruebas antes de modificar arquitectura.
4. Si está **VALIDADO EN HARDWARE**, no reemplazarla sin benchmark/regresión.
5. Si está **PENDIENTE**, trabajarla; no volver a tareas marcadas como descartadas.
6. Registrar cada nuevo cambio y su prueba inmediatamente después.

## Fuentes técnicas externas consultadas

- OBS obs-websocket 5.x: protocolo RPC, eventos, requests y autenticación.
- Twitch EventSub WebSocket: sesión, welcome, keepalive y reconnect.
- Twitch Chat: EventSub + API como camino recomendado actualmente.
