# Cari VRM — especificación experimental

## Objetivo
Crear una versión 3D VTuber de cuerpo completo, estilizada como chibi, que conserve la identidad visual de Cari y evite el aspecto de cabeza flotante.

## Identidad visual base
- Cabello marrón.
- Inner hair marrón claro.
- Largo medio.
- Cola de caballo.
- Blunt bangs.
- Sidelocks.
- Ojos marrones.
- Pupilas blancas.
- Cejas normales.
- Piel tan/marrón bronceada uniforme en toda la piel; no usar tanlines.
- Proporciones chibi/anime deliberadas.

## Requisitos del avatar
- VRM 1.0 como objetivo principal; aceptar VRM 0.x como compatibilidad si el loader lo requiere.
- Esqueleto humanoide completo.
- Cuerpo completo visible en la escena principal.
- Idle con respiración/movimiento corporal.
- Parpadeo y expresiones faciales.
- Visemas/lip-sync controlables por el motor de voz.
- Spring bones para cabello y ropa.
- Cámara con presets: full body, 3/4 y busto.
- Posibilidad de reemplazar el modelo sin cambiar el resto de Cari Studio.

## Actuación mínima
El avatar no debe limitarse a mover la boca. El motor deberá poder seleccionar, de forma independiente:
- emoción;
- mirada;
- inclinación de cabeza;
- pose;
- animación corporal;
- expresión facial;
- lip-sync.

Ejemplo conceptual:

`respuesta -> intención/emoción -> actuación -> animación + voz`

## Regla de integración
Este documento y cualquier loader/renderer nuevo permanecen en `experimental/` hasta completar pruebas reales de carga, animación, rendimiento y recuperación de errores. No integrar todavía en el pipeline principal.

## Licencias
No incluir un modelo VRM descargado en el repositorio hasta verificar su licencia individual y sus condiciones de redistribución. Preferir assets CC0 cuando sea posible.