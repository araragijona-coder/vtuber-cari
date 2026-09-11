# Pass 23 — memoria conectada al pipeline

## Objetivo

Cerrar el circuito de memoria de sesión para que la memoria bounded creada en Pass 22 deje de ser un módulo aislado.

## Cambios

- `LocalPipeline` crea una única `SessionMemory` por sesión/runtime.
- Cada respuesta local aceptada registra el turno.
- `LocalPipelineResult` expone un `memory_context` provider-neutral.
- Las respuestas que marquen `remember=True` pueden promover un dato sencillo a memoria mediante una clave normalizada.
- La memoria sigue teniendo límites duros y no almacena indefinidamente todo el chat.

## Verificación

- Suite completa: 76 tests OK.
- `compileall`: OK.
- No se añadió ninguna dependencia externa.

## Próximo cierre

La siguiente etapa debe llevar la misma disciplina a persistencia: guardar únicamente recuerdos explícitos/importantes, con escritura atómica, backup verificado y recuperación fail-closed.
