# Pass 22 — Working Memory Foundation

## Objetivo

Añadir continuidad de conversación sin convertir el bot en un almacén infinito de mensajes ni obligar a usar un LLM/API.

## Qué se agregó

- `app/memory/session.py`: memoria de sesión acotada.
- `SessionTurn`: conserva las últimas interacciones.
- `MemoryItem`: hechos explícitamente recordados, con origen y timestamp.
- Límites independientes para turnos y recuerdos.
- Normalización de claves para evitar duplicados accidentales (`Name` / ` name `).
- `context()` devuelve un formato neutral que un proveedor de IA puede consumir después, pero la memoria no llama a ninguna API.

## Diseño

```text
chat/evento
    ↓
SessionMemory
    ├─ últimos N turnos
    └─ recuerdos explícitos M
            ↓
      contexto opcional
            ↓
      router / modelo fuerte
```

La memoria no decide qué decir y no sustituye al cerebro. Su función es preservar continuidad y entregar contexto cuando otra capa lo solicite.

## Por qué ahora

La investigación de proyectos AITuber y PNGTuber actuales refuerza esta separación: conversación/memoria/eventos por un lado y render/avatar por otro. Cari debe conservar esa separación para poder crecer sin convertir cada mensaje en una llamada pesada.

## Próximo paso

Conectar esta memoria al pipeline de forma selectiva: guardar solamente respuestas marcadas como `remember=True` y preparar recuperación por relevancia sencilla antes de involucrar un modelo externo.
