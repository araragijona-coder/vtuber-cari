# Cari — puerta de calidad visual HD

Este documento define el mínimo para considerar que el avatar visual de Cari está listo para salir de `experimental/`.

## Objetivo

Cari debe verse como una VTuber anime/chibi cuidada y consistente, no como un VRM genérico colocado dentro de una ventana.

## Requisitos obligatorios

- Render objetivo mínimo: 1920x1080.
- Cámara principal con encuadre de cuerpo completo; presets 3/4 y busto también disponibles.
- Silueta y proporciones chibi/anime deliberadas.
- Cabello marrón, cola de caballo, blunt bangs y sidelocks coherentes con la identidad definida en `cari-vrm-spec.md`.
- Ojos y rostro legibles a distancia de streaming.
- Materiales toon/anime con iluminación estable y sin artefactos evidentes.
- Piel uniforme, sin tanlines accidentales.
- Parpadeo y expresiones faciales visibles.
- Mirada y giro de cabeza suaves, sin saltos bruscos.
- Idle corporal con respiración/movimiento natural.
- Cabello y ropa con física/spring bones estable cuando el modelo lo soporte.
- Lip-sync suficientemente claro para que la apertura de la boca corresponda a la voz.
- Sin cabeza flotante, clipping grave, ojos atravesando párpados ni deformaciones visibles durante las actuaciones principales.
- Sustitución del modelo sin modificar el resto del pipeline de Cari.

## Rendimiento de aceptación

La prueba final debe registrar FPS, frame time y errores del renderer. No se acepta como listo un avatar que cumpla la calidad visual pero degrade de forma evidente la interacción, la voz o la captura.

## Licencia

El modelo final debe tener licencia verificada y compatible con el uso previsto. No incorporar assets redistribuibles al repositorio hasta revisar sus condiciones.

## Criterio de salida de `experimental/`

Todos los puntos anteriores deben estar comprobados con un modelo real, además de las pruebas automatizadas del contrato del renderer. Un mock/fake renderer sirve para desarrollo, pero nunca cuenta como avatar VTuber terminado.
