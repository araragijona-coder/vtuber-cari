# Cari Studio — VTuber usability specification

## Objetivo

El modo VTuber debe sentirse utilizable durante una transmisión continua, no como una demo de tracking.

La referencia de uso es el flujo habitual de software VTuber maduro: cámara -> calibración -> tracking facial -> parámetros normalizados -> expresiones/acciones -> render; con controles manuales disponibles para corregir o reemplazar el automatismo.

VTube Studio documenta explícitamente el patrón de calibrar con expresión neutra y luego mapear parámetros de posición facial, ángulo, ojos, boca y expresiones. Cari adopta ese patrón de interacción sin copiar su implementación. See:
- https://github.com/DenchiSoft/VTubeStudio/wiki/Getting-Started
- https://github.com/DenchiSoft/VTubeStudio/wiki/Introduction-%26-Requirements

## Estados de tracking

```
idle
  ↓
camera active
  ↓
tracking
  ├── calibrating
  ├── lost-grace
  └── lost
```

### idle

No accede a la cámara y no ejecuta MediaPipe.

### camera active

La webcam está abierta, pero todavía no existe un modelo de tracking listo.

### tracking

MediaPipe Face Landmarker entrega datos y el bridge los convierte al contrato neutral del avatar.

### calibrating

El bridge recoge una ventana de muestras del rostro en posición neutra.

La calibración actual usa 30 muestras por defecto y centra:
- head X/Y/Z;
- gaze X/Y;
- mouth-open baseline.

El blink no se centra contra el baseline porque una calibración neutral no debe impedir detectar un parpadeo posterior.

### lost-grace

No se pierde inmediatamente el estado visible del avatar por un frame sin detección.

### lost

Tras la gracia configurada, movimiento de cabeza, mirada, boca y parpadeo vuelven progresivamente a cero.

Esto evita saltos bruscos cuando el usuario gira la cabeza, una mano cubre parcialmente la cara o la cámara pierde temporalmente el rostro.

## Controles de usuario

La vista Tracking proporciona:
- Iniciar / Detener cámara;
- Calibrar;
- Reset;
- suavizado;
- sensibilidad.

Los parámetros de ajuste se guardan en localStorage de la aplicación.

## Presets

### Estable

Suavizado alto y sensibilidad normal. Diseñado para una transmisión larga.

### Normal

Equilibrio entre latencia y estabilidad.

### Rápido

Menor smoothing y mayor respuesta. Debe validarse en hardware porque una cámara concreta puede introducir ruido.

## Expresiones

El tracking automático reconoce como mínimo:
- happy;
- angry;
- afraid;
- sad;
- embarrassed;
- neutral.

Las expresiones restantes del contrato pueden ser disparadas manualmente:
- exhausted;
- confused;
- focused.

La expresión manual tiene prioridad sobre la expresión automática hasta que se libere.

## Boca y voz

Hay dos fuentes de apertura de boca:
1. face tracking;
2. audio lip-sync.

El bridge de actuación compone ambas sin sobrescribir silenciosamente la otra fuente.

## Renderer

Three.js es el backend activo:
- glTF/GLB local;
- morph target aliases;
- placeholder técnico cuando no hay modelo.

El renderer no distribuye un modelo comercial ni una identidad visual propietaria.

## Live2D

Live2D permanece como adapter boundary.

La documentación oficial de Live2D indica que Cubism Core forma parte del paquete del SDK y no se publica en GitHub bajo la licencia propietaria. Por eso el repositorio no incorpora Cubism Core ni intenta redistribuirlo sin una revisión de licencia.

Fuente oficial:
https://docs.live2d.com/en/cubism-sdk-manual/cubism-core/

## Criterio de cierre VTuber

No pasar este módulo a producción hasta verificar:
1. tracking sostenido;
2. calibración repetible;
3. pérdida/recuperación de rostro;
4. parpadeo estable;
5. boca estable;
6. cabeza/gaze sin jitter excesivo;
7. carga real de GLB/GLTF;
8. render sostenido en el hardware objetivo;
9. composición del avatar dentro de la señal final;
10. lip-sync real sincronizado con audio.
