# Pass 29 — Twitch real integrado

## Cambios

- Se reemplazó el adaptador Twitch anterior por un puente basado en el modelo actual de TwitchIO 3.
- OAuth y persistencia/refresh de tokens quedan delegados al sistema gestionado de TwitchIO.
- Se agregó suscripción `ChatMessageSubscription` por WebSocket EventSub.
- Los mensajes Twitch pasan al mismo `LocalPipeline` que usa el cliente local.
- El trabajo síncrono del pipeline y TTS se ejecuta con `asyncio.to_thread` para no bloquear el loop de Twitch.
- Las respuestas se devuelven al chat mediante `message.respond`, con límite defensivo de 500 caracteres.
- Se agregó `run_twitch.py` como entrypoint de producción.
- Se agregaron pruebas del límite de configuración y estado de conexión.

## Flujo alcanzado

```text
Twitch OAuth
   ↓
EventSub ChatMessage
   ↓
TwitchLiveBot
   ↓
asyncio.to_thread
   ↓
LocalPipeline
   ↓
reglas locales / LLM opcional
   ↓
TTS + AvatarCommand
   ↓
respuesta Twitch
```

## Lo que aún necesita ejecución real

CI puede validar la base, pero no puede autorizar una cuenta Twitch, aportar el arte final de Cari ni controlar el OBS del usuario. Por eso el último 1% debe cerrarse con una prueba real en la PC objetivo.
