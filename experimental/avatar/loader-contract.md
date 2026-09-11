# Cari Avatar Loader — contrato experimental

## Objetivo
Definir la interfaz mínima que debe cumplir cualquier loader de avatar antes de entrar al runtime principal.

## Capacidades requeridas

```text
load(model_path)
unload()
is_loaded()
update(delta_seconds)
set_acting_state(state)
set_camera_preset(name)
get_metrics()
```

## Métricas mínimas

- loaded
- frame_time_ms
- fps_estimate
- draw_calls (si el renderer lo permite)
- memory_hint_mb (si está disponible)
- last_error

## Fallos

Un loader no debe cerrar Cari Studio de forma silenciosa. Los errores deben propagarse al monitor de diagnóstico, escribirse en el log de runtime y detener la etapa dependiente si el fallo impide continuar.

## Regla de integración
Primero se implementará un adaptador de prueba con un modelo VRM de licencia verificada. Hasta entonces este archivo es únicamente un contrato y no modifica `app/`.
