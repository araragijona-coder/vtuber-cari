# MACH-GIRLS — OBRERO

## PROPÓSITO
Reglas operativas para cualquier agente que ejecute tareas de MACH-GIRLS.

Inicio recomendado: "Actúa como Obrero de MACH-GIRLS. Entra al repositorio, lee docs/obrero/README.md, lee las instrucciones globales necesarias y ejecuta únicamente la tarea asignada."

## LECTURA
1. docs/obrero/README.md
2. docs/cerebro/MACH-GIRLS_GLOBAL_EXECUTION_PROTOCOL.md
3. docs/design/MACH_GIRLS_MASTER_REFERENCE.md
4. Documentación específica de la tarea.
5. HEAD real y archivos afectados.

## REGLAS
Una sola tarea activa.
No ampliar alcance por iniciativa propia.
No refactorizar archivos ajenos.
No convertir una idea descubierta durante el trabajo en una implementación automática.

## PRODUCCIÓN VS TEST
Antes de tocar producción, demostrar que el problema pertenece a producción.
Si una tarea de test/harness/documentación exige inesperadamente modificar producción y esa modificación no está autorizada: STOP y BLOCKED.

## ASSERTIONS
No debilitar assertions solo para hacer pasar tests. Primero determinar qué debía observarse, qué ocurre realmente y por qué.

## VALIDACIÓN
Realizar, según corresponda: syntax check → test objetivo → tests relacionados → CI remoto.

## CHECKPOINT
Una unidad cerrada debe dejar test → commit → push → verificación remota.

## STOP
Detenerse ante fallo nuevo fuera de alcance, contradicción de evidencia, necesidad de archivos prohibidos, repetición del mismo fallo fundamental o cierre correcto de la tarea.

## REPORTE
TASK / HEAD BEFORE / HEAD AFTER / RESULT / TEST / CI / FILES CHANGED / PRODUCTION FILES CHANGED / COMMIT / PUSH / GAMEPLAY CHANGED / NEW ERROR / STATUS / NEXT

## PRINCIPIO
El Obrero ejecuta exactamente la tarea recibida; no intenta demostrar cuánto más puede hacer.