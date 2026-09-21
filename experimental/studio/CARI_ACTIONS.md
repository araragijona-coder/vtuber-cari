# Cari — acciones runtime válidas

Fuente: experimental/studio/CARI_CHARACTER_BIBLE.md.

Estas acciones son estados de actuación visual. No redefinen la personalidad y pueden coexistir con tracking facial.

| ID | Tipo | Expresión | Uso |
|---|---|---|---|
| neutral | estado | neutral | Estado base |
| happy | emoción | happy | Alegría, iniciativa, celebración |
| sad | emoción | sad | Tristeza, quietud |
| angry | emoción | angry | Enojo protector |
| afraid | emoción | afraid | Miedo sin pérdida automática de iniciativa |
| embarrassed | emoción | embarrassed | Exposición personal / vergüenza |
| exhausted | emoción | exhausted | Fatiga y sobreesfuerzo |
| confused | emoción | confused | Incertidumbre/confusión |
| talking | acción | neutral + mouthOpen | Habla/visema simple |
| silent | acción | neutral + mouthOpen=0 | Cierra boca |

## Reglas

- AvatarActingBridge mantiene un único estado normalizado.
- AvatarActionStore es la única fuente de acciones persistentes.
- Las acciones con frames PNG/JPG/WebP pueden superponer arte 2D.
- El renderer Three.js aplica el mismo estado a GLB/glTF y al avatar procedural V0.
- MediaPipe puede sustituir o complementar el estado manual.
- AudioLipSync puede conducir mouthOpen cuando tracking facial no lo está actualizando.
- Los comandos de chat usan el mismo Action Store; no existe un segundo mapa de acciones.

## Visual V0

El avatar procedural preserva las invariantes confirmadas:
- piel morena/tan;
- cabello marrón medio;
- inner hair marrón claro;
- cola de caballo mediana;
- ahoge centrado;
- ojos marrones con pupilas blancas visibles;
- curita en la nariz;
- ropa deportiva con minishorts negros.

El color exacto de la prenda deportiva es un detalle de V0 técnico y no sustituye un diseño artístico final.

## Límites

- V0 es funcional para preview/overlay y validación de tracking.
- No es todavía un rig VRM/Live2D de producción.
- No se distribuye ningún modelo comercial.