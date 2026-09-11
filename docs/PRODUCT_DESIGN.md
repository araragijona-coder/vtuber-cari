# Cari — diseño implementado

Este documento registra la arquitectura que ya está representada por código en `main`.

## Flujo principal

`Twitch -> filtrado -> gate -> ranking -> reglas/responder -> AIResponse -> arbitraje de voz -> avatar -> memoria`

La respuesta del modelo se mantiene estructurada y separada de la representación visual.

## Cerebro y coordinación

- `app/brain/contracts.py`: contrato `AIResponse`.
- `app/brain/router.py`: respuestas locales y reglas.
- `app/brain/arbiter.py`: arbitraje de intenciones.
- `app/brain/coordinator.py`: admisión/coordinación.
- `app/brain/proactive.py`: intención proactiva.
- `app/brain/state_policy.py`: política según estado.
- `app/brain/event_bus.py`: eventos internos desacoplados para observabilidad y futuros adaptadores.
- `app/core/lifecycle.py`: ciclo de vida de subsistemas.

### Eventos de runtime

El pipeline puede emitir eventos como `message_received`, `message_filtered`, `message_gated`, `response_ready`, `llm_error`, `tts_error`, `speech_started`, `speech_finished`, `memory_saved` y `response_dropped`.

`LocalPipeline` crea por defecto un `EventJournal` acotado para que cada ejecución tenga telemetría de sesión sin configurar nada adicional. También puede recibir un `EventJournal` o un `EventBus` externo; no se permite pasar ambos a la vez para evitar dos fuentes ambiguas de verdad.

`EventJournal` mantiene los últimos eventos **en memoria y de forma acotada**. No se persiste automáticamente ni añade una base de datos: sirve para inspeccionar qué ocurrió durante una sesión, depurar fallos y preparar una futura consola de diagnóstico/replay.

Los listeners son observadores: un fallo de telemetría nunca puede romper el camino principal de chat. Esto deja preparado un punto único para UI, diagnóstico, métricas, replay y futuros conectores sin hacer que el cerebro dependa de ellos.

## Chat y memoria

- `app/intelligence/comment_filter.py`: normalización y filtro.
- `app/intelligence/comment_gate.py`: control de entrada.
- `app/intelligence/comment_intelligence.py`: ranking local.
- `app/memory/session.py`: memoria de sesión acotada.
- `app/memory/persistent.py`: memoria persistente versionada.

## Voz y arbitraje

- `app/voice/director.py`: convierte `AIResponse` en una solicitud de voz neutral al proveedor.
- `app/voice/arbiter.py`: cola determinista con prioridad, límite de presión, coalescencia por clave y propiedad explícita del turno de voz.
- `app/voice/safe.py`: frontera de fallos del TTS.

Cuando el arbitraje concede el turno, el avatar pasa a `speaking=True` exactamente durante la ejecución del TTS y vuelve a `speaking=False` al terminar, incluso si el TTS falla. Si una respuesta no consigue entrar en la cola, el avatar tampoco queda marcado como hablando. Así, el estado visual no afirma que Cari está hablando cuando realmente no posee el turno de voz.

La idea viene de un patrón habitual en VTubers en tiempo real: una sola salida de voz debe tener el "floor" y las respuestas compiten por prioridad en vez de hablar encima unas de otras. Proyectos abiertos como Lumi_Nox exponen un `speech_output_arbiter` y un `speaker_scheduler` como parte de su backbone de coordinación. El patrón se adopta aquí sin copiar implementación ni introducir dependencias externas.

## Avatar y escena

- `app/avatar/controller.py`: contrato de control.
- `app/avatar/motion.py`: movimiento render-neutral.
- `app/avatar/behavior.py`: eventos semánticos -> comportamiento.
- `app/avatar/reactions.py`: prioridades, cooldown y duración.
- `app/avatar/idle.py`: microcomportamientos de bajo costo.
- `app/scene/director.py`: zonas y reservas.
- `app/scene/attention.py`: objetivo de atención.
- `app/scene/composer.py`: composición independiente del renderer.
- `app/scene/render_cache.py`: cache determinista.
- `app/resources/quality.py`: FULL/BALANCED/ECO.

## Voz y Twitch

- `app/twitch/`: modelos, OAuth, adapter y bridge TwitchIO.
- `run_twitch.py`: entrada de producción para Twitch.

## Integridad

Persistencia sensible usa operaciones atómicas y falla cerrando ante estado inválido. Las credenciales y datos personales deben permanecer fuera del repositorio.

## Qué significa "implementado"

Implementado significa que existe código, contrato y pruebas deterministas para la pieza. No significa que el equipo externo esté configurado: credenciales Twitch, voz concreta, arte final del avatar y captura OBS requieren configuración del usuario.
