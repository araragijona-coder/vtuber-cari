# Cari Studio — OBS Companion / Streamer Readiness Audit

Fecha: 2026-09-21
Estado: AUDITORÍA CONTINUA

## Objetivo

Determinar qué necesita Cari Studio cuando OBS Studio es el streamer/encoder principal y qué partes de Cari no deben duplicar responsabilidades de OBS.

## Veredicto

Para uso diario con OBS como streamer, la arquitectura actual es suficiente como base de control VTuber + automatización, pero todavía requiere controles operativos y validaciones reales antes de considerarse una herramienta de producción.

Cari no necesita sustituir el encoder, muxer, red, Studio Mode ni sistema de fuentes de OBS en este escenario. Debe actuar como un control-plane especializado que aporta avatar, tracking, acciones/reacciones, chat/eventos, macros, control de escenas, control de audio operativo y observabilidad.

OBS WebSocket 5.x expone RPC, eventos y batches; además permite recibir InputVolumeMeters como suscripción de alto volumen. El cliente obs-websocket-js 5.0.8 soporta connect con parámetros de identificación y callBatch.

## Matriz de capacidades

| Capacidad | Estado Cari | Necesaria para uso diario con OBS | Gate |
|---|---|---|---|
| Conectar/desconectar OBS | IMPLEMENTADO | Sí | prueba real |
| Autenticación WebSocket | IMPLEMENTADO | Sí | prueba real |
| Detectar presencia de OBS | IMPLEMENTADO | Sí | Windows |
| Start/Stop Stream | IMPLEMENTADO | Sí | prueba real |
| Stream status | IMPLEMENTADO | Sí | prueba real |
| Start/Stop Recording | IMPLEMENTADO | Sí | prueba real |
| Recording status | IMPLEMENTADO | Sí | prueba real |
| Scene list/program | IMPLEMENTADO | Sí | prueba real |
| Preview scene | IMPLEMENTADO | Útil | Studio Mode |
| Studio Mode | IMPLEMENTADO | Útil | prueba real |
| Transition | IMPLEMENTADO | Útil | prueba real |
| Profiles | IMPLEMENTADO | Útil | prueba real |
| Scene Collections | IMPLEMENTADO | Útil | prueba real |
| Virtual Camera | IMPLEMENTADO | Opcional | prueba real |
| OBS stats | IMPLEMENTADO | Sí | interpretar métricas |
| Input list/kinds | IMPLEMENTADO | Sí | prueba real |
| Audio meters | EVENTO IMPLEMENTADO | Sí | prueba real + UI |
| Input mute | IMPLEMENTADO | Sí | UI |
| Input volume | IMPLEMENTADO | Sí | UI |
| Scene item enable/disable | IMPLEMENTADO | Sí | UI |
| Replay Buffer | IMPLEMENTADO | Muy útil para gaming | prueba real |
| Batch scene automation | IMPLEMENTADO | Útil | prueba real |
| Auto reconnect OBS WS | IMPLEMENTADO | Sí | caída/reinicio |
| Reconnect bounded backoff | IMPLEMENTADO | Sí | prueba real |
| Error classification | IMPLEMENTADO | Sí | ampliar con evidencia |
| Filters | PREPARADO | No imprescindible | posterior |
| Text/browser-source automation | PREPARADO/PENDIENTE | Útil | posterior |
| Stream captions | PENDIENTE | Opcional | posterior |
| Advanced source transform | PREPARADO | Útil | posterior |
| OBS plugin dependency | NO | No | mantener opcional |

## Lo que OBS debe seguir haciendo

Cuando OBS sea el streamer principal, OBS debe conservar como fuente de verdad:

1. encoder y codec final;
2. bitrate y configuración del servicio;
3. muxing/grabación;
4. conexión RTMP/RTMPS;
5. reconexión del stream;
6. canvas/output resolution;
7. composición principal de escenas;
8. Game Capture y fuentes propias de OBS;
9. monitorización nativa del stream.

OBS documenta scenes/sources como núcleo de composición, Studio Mode para preparar cambios sin exponerlos al público, y Automatic Reconnect para la conexión de stream. citeturn881043search2turn881043search4

## Lo que Cari debe hacer

```text
Cámara
  ↓
MediaPipe
  ↓
Normalized Acting State
  ↓
Cari Avatar / acciones
  ↓
Overlay / Compositor
  ↓
OBS
```

y:

```text
Twitch / EventSub
  ↓
Automation
  ↓
Cari Action Store
  ↓
Avatar / TTS / efectos / escena OBS
```

Esto evita convertir Cari en un clon del frontend de OBS.

## Audio: punto crítico

Para este modo hay que evitar tener dos mixers independientes compitiendo por la misma fuente.

Configuración objetivo:

```text
Mic / Game / Music
        ↓
       OBS
        ↓
   Stream output

Cari mic capture
        ↓
voice DSP / tracking / lip-sync
        ↓
Avatar control
```

Si se desea que la voz procesada por Cari llegue al stream de OBS, todavía falta validar un backend de audio virtual/local apropiado o una ruta de dispositivo compartido. El procesamiento local actual no debe declararse automáticamente como entrada de OBS.

## Avatar: punto crítico

La ventana transparente/overlay de Cari puede servir como puente práctico inicial hacia OBS mediante captura de ventana, pero eso no equivale a:

```text
Cari GPU texture
   ↓
OBS compositor
   ↓
encoder
```

El objetivo de producción sigue siendo evitar readback CPU por frame.

## Reconexión

Hay dos mecanismos diferentes:

- OBS WebSocket reconnect: Cari reconecta su canal de control si OBS se reinicia o cierra.
- OBS stream reconnect: OBS recupera la conexión con Twitch/YouTube.

Cari no debe intentar reemplazar el segundo en modo companion.

## Mínimo para considerar usable con OBS

### MUST

- OBS WebSocket estable;
- Start/Stop Stream;
- Scene switching;
- Studio Mode/Transition;
- Record;
- Status;
- Stats;
- audio mute/volume;
- scene/source visibility;
- reconexión del WebSocket;
- autenticación;
- avatar overlay estable;
- tracking estable;
- hotkeys;
- shutdown limpio.

### SHOULD

- Replay Buffer;
- batch de macros;
- meters de audio;
- scene item transforms;
- filter enable/disable;
- presets de escenas;
- perfiles de OBS.

### NICE TO HAVE

- text source updates;
- browser source refresh;
- captions;
- projector control;
- multi-output automation.

## Dependencias y compatibilidad

`obs-websocket-js` 5.0.8 figura como release reciente del cliente y su documentación incluye `connect`, `EventSubscription.InputVolumeMeters` y `callBatch()`. citeturn430406search0turn780439search0turn357971search3

OBS WebSocket está incluido con OBS Studio moderno y su documentación recomienda protegerlo con contraseña. citeturn761303search1

El protocolo actual también contempla cambios de Scene Collection y recomienda evitar requests durante ese cambio; el servicio de Cari mantiene un guard local para ese período. citeturn430406search1turn430406search2

## Riesgos

- cambios de API/requests de OBS deben comprobarse contra el RPC negociado;
- caída de OBS y caída de Twitch son fallos distintos;
- eventos de alto volumen no deben suscribirse indiscriminadamente;
- el overlay no debe convertirse en dependencia de captura de pantalla completa;
- una prueba local contra OBS no sustituye una sesión Windows prolongada.

## No repetir

- No implementar un segundo encoder para el modo companion.
- No implementar un segundo sistema de escenas cuando OBS es la fuente de verdad.
- No implementar un segundo mixer de streaming.
- No sustituir el reconnect nativo de OBS para Twitch/YouTube.
- No crear otro cliente OBS WebSocket.
- No crear otro sistema de hotkeys.
- No crear otro renderer de avatar para solucionar la integración.

## Siguiente gate

1. terminar UI operativa para mute/volumen/Replay Buffer/scene-item;
2. prueba real OBS WebSocket;
3. prueba de reinicio de OBS y reconexión;
4. prueba de cambio de Scene Collection;
5. prueba de sesión prolongada con avatar + tracking + OBS;
6. medir CPU/GPU y estabilidad;
7. después cerrar compositor GPU y E2E propio.