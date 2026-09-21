# TwitchIO experimental

Este directorio contiene el primer puente real de Cari con Twitch. No se integra todavía en el arranque normal hasta hacer una prueba real de canal.

## Qué prueba

```text
Twitch EventSub
    ↓
ChatMessage
    ↓
ChatMessage de Cari
    ↓
LocalPipeline
    ├─ reglas locales
    ├─ Ollama si hace falta
    └─ API solo como respaldo
    ↓
TTS local
    ↓
respuesta escrita en Twitch
```

La implementación usa TwitchIO 3 y EventSub WebSocket, no el IRC antiguo.

TwitchIO gestiona la reconexión del WebSocket y la recreación de suscripciones. Cari añade un ledger local que observa cada `session_welcome`, registra la generación del socket y verifica que las suscripciones esperadas siguen activas; no implementa un segundo gestor de sockets. La documentación de Twitch exige volver a suscribirse tras perder una sesión y TwitchIO realiza esa lógica internamente. citeturn720701search0turn404085view0 TwitchIO documenta `channel.chat.message` como la suscripción para recibir mensajes y `message.respond()` como vía para responder autenticadamente. La autorización requiere los scopes de chat correspondientes.

## Instalación lenta / verificable

No instalar esto a ciegas. Primero ejecutar el instalador seguro y, si todo termina correctamente, instalar el extra opcional:

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".[twitch]"
```

Después verificar:

```powershell
.\.venv\Scripts\python.exe -c "import twitchio; print(twitchio.__version__)"
```

Si cualquiera de los pasos falla, detenerse y copiar el error completo de la consola y `data/last-install-error.txt`.

## Twitch Developer

Crear una aplicación en Twitch Developer Console. No guardar secretos en Git.

Variables necesarias para el puente:

- `TWITCH_CLIENT_ID`
- `TWITCH_BOT_ID`
- `TWITCH_BROADCASTER_ID`

La primera autorización se hace mediante Device Code Flow. Esto evita meter el client secret dentro del ejecutable de Cari. Los tokens gestionados por TwitchIO tampoco deben subirse al repositorio.

## Importante

Esto no elimina la autenticación de Twitch. No existe una puerta trasera legítima que permita enviar mensajes a un canal sin autorización. La idea de Cari es eliminar la dependencia de APIs de IA, no saltarse la seguridad de Twitch.


## Prueba local de continuidad

`test_continuity.py` prueba de forma determinista el cambio de generación de WebSocket y la auditoría de suscripciones. La simulación no sustituye una prueba real con Twitch CLI/una cuenta de canal.

## Arquitectura actual

El transporte TwitchIO no contiene lógica de Studio. La ruta canónica es:

TwitchIO EventSub -> TwitchController -> EventBus -> AutomationEngine -> LocalCariActionHandler -> StudioActionRouter -> backend local.

`TwitchController` aplica deduplicación bounded cuando existe `message_id`, controla comandos locales, voz pública y tiempos de acciones. `EventBus` es compartido con `LocalPipeline`; no crear un bus paralelo.

El `StudioActionRouter` acepta acciones de chat, sonido, escena, overlay, música, stream, recording, source, volume, mute, camera, avatar, expression, tracking, command y voice. La ejecución concreta contra Native Engine u OBS todavía pertenece al siguiente gate de integración.
