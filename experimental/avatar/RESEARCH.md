# Investigación experimental — Avatar VRM

## Hallazgos

### Open Source Avatars
El repositorio `ToxSam/open-source-avatars` mantiene un registro de avatares VRM gratuitos con licencia indicada por colección/asset. Incluye una colección 100Avatars CC0 y colecciones comunitarias con CC0 o CC-BY. No se debe asumir una licencia global: hay que comprobar la licencia del avatar elegido.

### @pixiv/three-vrm
`@pixiv/three-vrm` es una base MIT para cargar VRM sobre Three.js. Soporta el pipeline necesario para construir un renderer independiente del modelo.

### Character Studio
`M3-org/CharacterStudio` es una referencia útil para estudiar edición de avatares, exportación GLB/VRM, animaciones y optimización. Se mantiene como inspiración; no se copia código sin revisar licencia y necesidad.

### VRM Game Starter
`norio/vrm-game-starter` demuestra un patrón útil: avatar VRM intercambiable, retargeting de animaciones, idle/walk/run/jump y control corporal sin depender de un motor de física pesado.

### Hanami
`Undi95/Hanami` es una referencia de arquitectura local-first que combina VRM, Three.js, animaciones y un personaje que actúa mientras conversa. Es especialmente interesante para el objetivo de que Cari no sea sólo una boca animada.

### StreamAvatar
`MRamiBalles/streamavatar` explora una arquitectura local para avatar VRM con tracking, spring bones y lip-sync. Se toma como referencia conceptual, no como dependencia.

### three-vrm-lip-sync
`vlapky/three-vrm-lip-sync` demuestra una estrategia especialmente útil para Cari: analizar el audio localmente y conducir los cinco visemas VRM (`aa/ih/ou/ee/oh`) sin reconocimiento de texto ni servidor. Esto encaja con el requisito de que TTS/lip-sync no dependan de una API de IA.

### AITuber OnAir
`shinshin86/aituber-onair` demuestra una separación modular donde VRM, animaciones idle, lip-sync, cámara y chat pueden convivir sin obligar al avatar a depender de un proveedor LLM concreto. Su ejemplo VRM es una referencia útil para la primera prueba de renderer.

### r3f-vrm
`r3f-vrm` es otra referencia interesante porque separa emociones, parpadeo, visemas, movimiento corporal, spring motion, cámara/gaze y carga del VRM. La idea que interesa a Cari es la separación de subsistemas y el suavizado/interpolación, no copiar la implementación.

## Dirección técnica propuesta

```text
Cari Studio
  -> Avatar Engine
      -> VRM Loader
      -> Camera Controller
      -> Expression Controller
      -> Lip Sync Controller
      -> Animation Controller
      -> Spring Bone / physics adapter
      -> Acting Controller
      -> Performance Monitor
      -> Error Recovery
```

El `Avatar Engine` debe recibir un modelo VRM externo y exponer una interfaz estable al resto de la aplicación. Así el modelo visual de Cari puede cambiar sin rehacer escenas, audio, Twitch o IA.

## Principio importante

El renderer debe ser independiente de la inteligencia. Un saludo, parpadeo, idle, respiración, lip-sync, transición de cámara o animación no debe llamar a Ollama ni a una API. La inteligencia sólo decide cuando realmente aporta valor: intención, emoción compleja, actuación contextual, diálogo o decisiones del personaje.

## Criterio de selección del modelo base
1. Licencia redistribuible compatible con el proyecto.
2. VRM humanoide válido.
3. Cuerpo completo.
4. Expresiones/blendshapes utilizables.
5. Spring bones para cabello/ropa.
6. Topología y materiales suficientemente editables para aproximar a Cari.
7. Rendimiento razonable para el equipo objetivo.

## Pendientes
- Seleccionar un modelo CC0 concreto.
- Verificar metadatos/licencia dentro del VRM.
- Probar carga real.
- Probar expresiones.
- Probar animaciones.
- Probar lip-sync.
- Medir FPS/CPU/RAM.
- Probar errores de carga y fallback.
- Sólo después considerar integración en `app/`.
