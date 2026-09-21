# Cari V1 — Artist / Rigger Delivery Checklist

Estado actual: SPEC_ONLY.

Este checklist define cuándo una entrega de arte puede entrar al pipeline sin obligar a rehacerla después.

## A. Canon visual

- [ ] piel morena/tan;
- [ ] cabello castaño medio;
- [ ] inner hair más claro;
- [ ] coleta media;
- [ ] ahoge centrado;
- [ ] ojos marrones;
- [ ] pupilas blancas redondas;
- [ ] venda/curita nasal visible;
- [ ] estética runner/deportiva;
- [ ] camiseta deportiva ajustada o atada a la cintura;
- [ ] shorts negros/bike shorts negros;
- [ ] sin accesorios prohibidos.

## B. Arte fuente

- [ ] archivo maestro editable entregado;
- [ ] nombres de capas estables;
- [ ] lineart separado cuando la deformación lo requiera;
- [ ] sombras/correcciones separables cuando la deformación lo requiera;
- [ ] zonas ocultas completamente pintadas donde exista riesgo de revelar huecos;
- [ ] bordes limpios y sin transparencias accidentales;
- [ ] ningún contenido importante fusionado en una capa que deba deformarse por separado.

## C. Piezas de rigging

Las piezas obligatorias deben coincidir con el manifest de capas.

head, hair_back, hair_side_L, hair_side_R, hair_front, ahoge, eye_L, eye_R, iris_L, iris_R, pupil_L, pupil_R, brow_L, brow_R, mouth, nose_bandage, torso, shirt, arm_L, arm_R, hand_L, hand_R, leg_L, leg_R, shorts, shoe_L, shoe_R, ponytail.

neck es pieza de soporte.

## D. Turnaround

- [ ] frente;
- [ ] 3/4 izquierda;
- [ ] 3/4 derecha;
- [ ] perfil de referencia;
- [ ] pose neutra;
- [ ] expression sheet.

## E. Expresiones P0

- [ ] neutral;
- [ ] happy;
- [ ] angry;
- [ ] sad;
- [ ] surprised;
- [ ] embarrassed;
- [ ] sleepy;
- [ ] talking.

## F. Rigging P0

- [ ] head yaw/pitch/roll;
- [ ] gaze X/Y;
- [ ] blink L/R;
- [ ] mouth open;
- [ ] expression controls;
- [ ] speaking/talking;
- [ ] neutral recovery.

## G. Física P1

- [ ] ponytail;
- [ ] ahoge;
- [ ] side hair.

La física no debe generar huecos visibles ni romper la silueta.

## H. Export / licencia

- [ ] export 2D reproducible;
- [ ] export GLB/glTF reproducible si se entrega 3D;
- [ ] VRM metadata correcta si se entrega VRM;
- [ ] autoría registrada;
- [ ] licencia registrada;
- [ ] assets de terceros identificados;
- [ ] archivos de terceros con licencia compatible o permiso documentado.

## Gate

SPEC_ONLY → ART_READY → RIG_READY → TRACKING_TESTED → WINDOWS_VERIFIED → HARDWARE_VALIDATED → PRODUCTION_VALIDATED

Una ilustración terminada visualmente no salta etapas.
