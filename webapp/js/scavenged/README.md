# Scavenged Modules

Zona aislada para componentes rescatados/adaptados de efectos visuales y audio.

## Estructura

`webapp/js/scavenged/`

- `audio/` — generadores de sonido sintético y pequeños procesadores Web Audio.
- `canvas/` — partículas, efectos de velocidad, HUD y renderizado Canvas.
- `ui/` — paneles poligonales, textos flotantes, overlays y fuentes.

## Regla de aislamiento

Cada pieza debe ser autocontenida y depender únicamente de contratos explícitos o APIs estándar del navegador.

Un componente problemático se elimina sustituyendo o borrando solamente su archivo dentro de su propia subcarpeta.

## Estados

- **scavenged:** rescatado/adaptado; todavía experimental.
- **verified:** probado de forma reproducible.
- **accepted:** integrado al runtime principal tras superar su gate.

No se debe importar un módulo scavenged directamente desde el motor multimedia nativo.
