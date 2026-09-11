# Cari — renderer VRM real experimental

Esta carpeta es la primera prueba de un renderer VRM real para Cari. Sigue aislada de `app/` y de `main` hasta completar las pruebas de calidad.

## Base técnica

- Three.js `0.180.0`.
- `@pixiv/three-vrm` `3.5.5`.
- `@pixiv/three-vrm-animation` `3.5.5`, preparado para la siguiente fase de animaciones VRMA.
- WebGL como primera ruta de compatibilidad.

La documentación oficial de `@pixiv/three-vrm` muestra el mismo patrón de integración: `GLTFLoader` + `VRMLoaderPlugin`, `VRMUtils` para optimización y `vrm.update(deltaTime)` en el loop. La librería se publica bajo MIT. No se incorpora ningún modelo externo al repositorio todavía.

## Qué funciona en esta fase

1. Crear escena Three.js a pantalla completa.
2. Cargar un archivo `.vrm` elegido por el usuario.
3. Validar que el GLTF contiene un `userData.vrm`.
4. Aplicar optimizaciones básicas del loader.
5. Mantener `VRM.lookAt` apuntando a un objetivo controlado por el mouse.
6. Actualizar el VRM por frame.
7. Reemplazar el modelo y liberar geometrías/materiales/texturas del modelo anterior.
8. Mostrar errores de carga sin tumbar la aplicación web experimental.

## Todavía NO se considera terminado

- modelo visual definitivo de Cari;
- expresiones/emociones conectadas al `AvatarActingState` de Python;
- animaciones VRMA reproducibles desde el motor de actuación;
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

## Regla de integración

Este renderer permanece en `experimental/` hasta que un VRM real pase la puerta de calidad visual de Cari. Un modelo de prueba sirve para validar el pipeline, pero no cuenta como el avatar final.
