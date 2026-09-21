# Cari V1 — Expression Sheet Specification

## Objetivo

Preparar un set de expresiones que pueda alimentar tanto un PNGTuber como un rig 2D.

## Estados

| Estado | Componentes principales | Regla |
|---|---|---|
| neutral | mirada neutra, boca cerrada | baseline |
| happy | ojos/cejas/boca positivos | energético |
| angry | cejas/ojos/boca tensos | protector, no cruel |
| sad | mirada baja, boca triste | no recovery instantánea |
| surprised | ojos abiertos, cejas arriba, boca abierta | reacción clara |
| embarrassed | rubor opcional, ojos/boca tímidos | no convertir personalidad en tímida |
| sleepy | párpados caídos, boca relajada | baja energía |
| talking | boca animable | overlay con tracking/lip-sync |

## Compatibilidad

Las expresiones son capas/estados visuales. No reemplazan el estado de actuación.

Deben poder combinarse con:

- head yaw/pitch/roll;
- gaze;
- blink izquierdo/derecho;
- mouth open;
- speaking;
- movimiento de cabello.

## Export

Cada expresión estática debe poder exportarse a PNG/WebP transparente.

El rig continuo debe derivarse de las mismas piezas; no crear un segundo diseño incompatible.
