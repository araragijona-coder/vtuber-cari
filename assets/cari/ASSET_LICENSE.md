# Cari V1 — Asset licensing record

Estado actual: **SPEC_ONLY**.

Este archivo documenta la política de procedencia del asset. No concede licencia sobre arte que todavía no existe.

## Regla

Cada entrega artística real debe registrar:

- autor/es;
- fecha de entrega;
- fuente/procedencia;
- licencia de uso;
- permiso comercial cuando corresponda;
- assets de terceros incluidos, con sus licencias;
- versión/hash del paquete entregado.

## Motor / tooling

Inochi2D se mantiene como backend 2D opcional. Su proyecto y subproyectos principales publican software bajo BSD-2-Clause, y el proyecto indica que la licencia de los modelos creados con sus herramientas la decide el usuario/autor. citeturn347179search0turn347179search1

Live2D/Cubism se mantiene como adapter opcional y no se distribuye su runtime propietario dentro del repositorio.

## Regla de promoción

No marcar `ART_READY` ni `PRODUCTION_VALIDATED` hasta que la licencia del arte y de todos sus componentes de terceros esté documentada.
