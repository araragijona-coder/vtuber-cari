# Cari — renderer VRM real experimental

Esta carpeta contiene la prueba de un renderer VRM real para Cari. Sigue aislada de `app/` y de `main` hasta completar las pruebas de calidad.

## Base técnica

- Three.js `0.180.0`.
- `@pixiv/three-vrm` `3.5.5`.
- `@pixiv/three-vrm-animation` `3.5.5`.
- WebGL como primera ruta de compatibilidad.

La documentación oficial de `@pixiv/three-vrm` utiliza `GLTFLoader` + `VRMLoaderPlugin`, `VRMUtils` para optimización y `vrm.update(deltaTime)` en el loop. Su ejemplo oficial de animación usa `THREE.AnimationMixer`; el renderer experimental de Cari sigue ese patrón y añade carga de VRMA mediante `VRMAnimationLoaderPlugin` + `createVRMAnimationClip`. citeturn0search0turn0search7

## Qué funciona en esta fase

1. Crear escena Three.js a pantalla completa.
2. Cargar un archivo `.vrm` elegido por el usuario.
3. Validar que el GLTF contiene un `userData.vrm`.
4. Aplicar optimizaciones básicas del loader.
5. Mantener `VRM.lookAt` apuntando a un objetivo controlado por el mouse.
6. Actualizar el VRM por frame.
7. Reemplazar el modelo y liberar geometrías/materiales/texturas del modelo anterior.
8. Mostrar errores de carga sin tumbar la aplicación web experimental.
9. Cargar un `.vrma` elegido por el usuario.
10. Convertir la animación VRMA a un `AnimationClip` compatible con el VRM cargado.
11. Reproducir la VRMA con `THREE.AnimationMixer` sin mezclarla con la lógica de cámara.
12. Mantener parpadeo procedural mientras el modelo está activo.
13. Proporcionar cámaras `full_body`, `three_quarter` y `bust`.
14. Mostrar FPS aproximados durante la ejecución.

## Todavía NO se considera terminado

- modelo visual definitivo de Cari;
- expresiones/emociones conectadas al `AvatarActingState` de Python;
- actuación procedural completa y mezcla de estados;
- lip-sync con audio real;
- spring bones ajustados para el modelo definitivo;
- métricas FPS/frame time integradas con Cari;
- puente Python ↔ renderer web;
- captura 1920x1080 validada con OBS;
- prueba de rendimiento en el equipo objetivo.

## Prueba manual

```bash
npm install
npm run check
```

Después debe servirse esta carpeta mediante un servidor HTTP local. Abrir `index.html` directamente con `file://` no es el escenario de prueba recomendado.

1. Selecciona un `.vrm` compatible.
2. Selecciona un `.vrma` compatible.
3. Pulsa `Reproducir VRMA`.
4. Usa `1`, `2` y `3` para cambiar de cámara.
5. Mueve el puntero para probar el objetivo de mirada.

## Regla de integración

Este renderer permanece en `experimental/` hasta que un VRM real pase la puerta de calidad visual de Cari. Un modelo de prueba sirve para validar el pipeline, pero no cuenta como el avatar final. OBS seguirá siendo externo: Cari sólo debe entregar una salida visual estable para que OBS la capture.
