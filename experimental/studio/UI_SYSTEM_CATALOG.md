# Cari Studio — catálogo de sistemas de interfaz

Actualizado: 2026-09-20

Este documento define la superficie que debe existir en el menú y separa visibilidad de capacidad backend.

## Estados

- connected: conectado y utilizable en el runtime actual.
- eventsub: evento Twitch modelado/conectado al pipeline.
- prepared: menú y contrato preparados; falta una integración o validación final.
- planned: superficie prevista, todavía sin ejecución.

## Twitch

El centro Twitch representa las superficies relevantes para operación de un canal:
Chat, follows, subscriptions, gifts, resubscriptions, cheers, raids, Channel Points, polls, predictions, Hype Train, ads, schedule, moderation, VIP/moderators, shoutouts, suspicious users, Shared Chat, Guest Star, power-ups y stream lifecycle.

Twitch EventSub publica eventos para chat, follows, suscripciones, gifts, cheers, raids, Channel Points, polls, predictions, Hype Train, Shield Mode, shoutouts, suspicious users, Shared Chat, Guest Star y estados online/offline, entre otros.

El runtime actual mantiene una única conexión EventSub de chat. Las operaciones avanzadas de broadcaster necesitan sus scopes y endpoints específicos.

## OBS

El Centro OBS expone la superficie de control que Cari necesita para operar un OBS existente:
streaming, recording, estados, scenes, program/preview, inputs/sources, input kinds, profiles, scene collections, Studio Mode, transition, virtual camera y stats.

OBS permanece opcional. El motor nativo de Cari sigue pudiendo capturar y emitir directamente.

## VTuber

El bloque VTuber se divide en Editor, Tracking, Avatar, Expresiones y Assets.

Capacidades:
- GLB/glTF + Three.js.
- expresiones normalizadas.
- acciones y frames PNG/JPG/WebP.
- MediaPipe Face Landmarker.
- head pose, gaze, blink y mouth.
- lip-sync local.
- cámara local.
- presets JSON.
- overlay transparente.
- accesorios y perfiles de apariencia.
- Live2D adapter boundary.
- compositor VRM nativo futuro.
- voz local anime-bright.

## Regla

Una entrada del menú no se considera implementación completa por existir. Debe tener backend, tratamiento de error, prueba y validación correspondiente.

Fuentes de referencia:
- Twitch EventSub: https://dev.twitch.tv/docs/eventsub
- Twitch EventSub types: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
- Twitch API reference: https://dev.twitch.tv/docs/api/reference
- OBS Studio backend design: https://docs.obsproject.com/backend-design
- obs-websocket protocol: https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md
