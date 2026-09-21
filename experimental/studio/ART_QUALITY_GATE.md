# Cari Studio — Art Quality Gate

## Propósito
Evitar aceptar un avatar porque se ve más bonito sin comprobar que también funciona como personaje VTuber en streaming.

## Calidad visual objetivo

### Silueta
- reconocible en thumbnail;
- lectura limpia contra fondo claro y oscuro;
- postura con energía atlética;
- coleta y ahoge identificables.

### Rostro
- ojos/iris/pupilas legibles;
- bandage de nariz visible;
- cejas con rango suficiente;
- boca útil para talking/lip-sync;
- emociones distinguibles sin depender de color.

### Diseño
- respeta `CARI_CHARACTER_BIBLE.md`;
- no agrega accesorios prohibidos;
- ropa deportiva canónica con estilización moderna;
- asimetría solo cuando ayude a la lectura.

### Rendering
- sin geometría de prueba que parezca un juguete low-poly;
- materiales coherentes;
- iluminación favorece ojos/cabello/rostro;
- anti-aliasing y color management consistentes;
- cámara de preview favorece lectura del personaje.

### VTuber
- blink estable;
- head pose estable;
- gaze natural;
- mouth/lip-sync estable;
- expresiones no destruyen la pose base;
- tracking perdido vuelve suavemente al neutral.

### Producción
- asset separable por partes;
- compatible con GLB/glTF/VRM;
- posible adaptación 2D sin rediseñar la personalidad;
- licencia documentada.

## Estados de evidencia
`SPEC_ONLY` · `CODE_EXISTS` · `VISUAL_REVIEWED` · `TRACKING_TESTED` · `WINDOWS_VERIFIED` · `HARDWARE_VALIDATED` · `PRODUCTION_VALIDATED`

## Regla de benchmark
No comparar Cari con una VTuber concreta usando ganador/perdedor. El benchmark es cualitativo: legibilidad, coherencia, expresividad, calidad de model sheet, riggability y estabilidad en streaming.

## Referencias técnicas
- Ironmouse character reference sheet: https://x.com/ironmouse/status/1376729110223929345
- Usada Pekora official profile: https://hololive.hololivepro.com/en/talents/usada-pekora/
- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html

## Estado actual
- Dirección visual Cari V1: `SPEC_ONLY`.
- Fallback procedural estilizado: `CODE_EXISTS`.
- Asset V1 real: pendiente.
- Validación visual/Windows/hardware: pendiente.