# Scavenged Modules

Zona aislada para componentes visuales/audio rescatados, adaptados o experimentales.

## Regla de aislamiento

Cada pieza debe vivir en su subcarpeta correspondiente:

- `audio/`: generadores/procesadores de sonido sintético.
- `canvas/`: partículas, velocidad, HUD y efectos Canvas.
- `ui/`: paneles, textos flotantes, overlays y recursos tipográficos.

Un componente que falle o no encaje se elimina o sustituye por archivo dentro de su propia subcarpeta.

## Estados

- `scavenged`: rescatado/adaptado, todavía no promovido.
- `verified`: probado de forma reproducible.
- `accepted`: aprobado para ser usado por la aplicación principal.

Los módulos scavenged no deben introducir dependencias globales ni modificar directamente el runtime principal.
