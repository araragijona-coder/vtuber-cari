# Pass 24 — persistencia segura de memoria

## Objetivo

Pasar de memoria de sesión a un almacén persistente pequeño, verificable y fail-closed.

## Implementación

`PersistentMemoryStore` guarda únicamente `MemoryItem` explícitos en JSON versionado.

- escritura atómica mediante `IntegrityManager`;
- backup y verificación de hash heredados de la capa de integridad;
- formato versionado;
- límite duro de elementos;
- lectura corrupta o incompatible = `IntegrityError`, nunca estado parcialmente aceptado;
- sin dependencias nuevas.

## Verificación

- Suite completa: 79 tests OK.
- `python -m compileall -q app tests`: OK.
- Tests específicos cubren round-trip, corrupción y límite de memoria.

## Estado

La persistencia está implementada como servicio aislado. La integración automática con el runtime se mantiene deliberadamente separada para no convertir cada sesión de desarrollo/test en una escritura de disco implícita.
