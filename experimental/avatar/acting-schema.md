# Cari Avatar Acting — schema experimental

## Propósito
Separar la actuación del avatar del modelo VRM concreto. El motor no debe asumir una malla, un modelo o una implementación de tracking específicos.

## Estado de actuación

```text
AvatarActingState
├── emotion
├── gaze
├── head_tilt
├── pose
├── body_animation
├── facial_expression
└── lip_sync
```

## Valores iniciales

- `emotion`: neutral, happy, sad, surprised, angry, thinking, excited, embarrassed
- `gaze`: camera, left, right, up, down, target
- `head_tilt`: -1.0 .. 1.0
- `pose`: neutral, relaxed, thinking, greeting, excited
- `body_animation`: idle, talk, think, wave, nod, celebrate
- `facial_expression`: neutral, smile, blink, surprised, sad, angry
- `lip_sync`: viseme/phoneme state supplied by the voice layer

## Regla de seguridad
Este esquema es únicamente un contrato experimental. No conecta todavía con el runtime principal y no ejecuta código de terceros.

## Integración futura
La escena recibirá un estado de actuación y lo traducirá al API del avatar cargado. Así podremos cambiar de modelo VRM sin reescribir el cerebro de Cari Studio.
