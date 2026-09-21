# Cari Studio — contrato de backends de Studio Runtime

## Decisión canónica

StudioRuntimeBindings es la única frontera de acciones.

NativeBackend
- prioridad 100
- backend principal
- representa el Native Engine local

OBSBackend
- prioridad 50
- opcional
- representa obs-websocket

## Routing

- AUTO: intenta NativeBackend primero y usa OBS solo si el backend nativo no está disponible o no tiene la capacidad.
- NATIVE: usa únicamente NativeBackend y nunca hace fallback a OBS.
- OBS: usa únicamente OBSBackend y requiere que esté configurado.
- Un error durante execute no provoca fallback automático, para no duplicar efectos parciales.
- Si ningún backend puede ejecutar una acción, se publica el evento tipado correspondiente y studio_action_unhandled; no se simula éxito.

## Capacidades

chat, sound, scene, overlay, music, stream, recording, source, volume, mute, camera, avatar, expression, tracking, command y voice.

Registrar una capacidad significa que existe un handler real. Una tarjeta del menú no convierte por sí sola una capacidad en funcional.

## Integración

- app/studio/runtime_bindings.py contiene el contrato y router.
- NativeBackend permite inyectar el puente real hacia el motor nativo sin acoplar el router a Electron, Win32 o un transporte concreto.
- OBSBackend permite inyectar el cliente OBS sin convertir OBS en dependencia del core.
- LocalPipeline usa StudioRuntimeBindings como frontera de acciones.
- runtime.register mantiene compatibilidad y registra en NativeBackend por defecto.

## No duplicar

- No crear otro BackendRouter.
- No crear otro ObsActionRouter ni NativeActionRouter.
- No crear otro StudioRuntimeBindings.
- Un backend nuevo debe implementar el mismo contrato y añadir pruebas de routing.
