# Cari Avatar Renderer — plan de pruebas experimental

Este documento define una prueba incremental antes de integrar un renderer VRM en `app/`.

## Fases

1. **Loader** — cargar un VRM local y mostrar progreso/error.
2. **Frame loop** — actualizar `vrm.update(delta)` sin animación.
3. **Camera** — presets full-body, 3/4 y busto; encuadre automático por bounding box.
4. **Idle** — respiración/parpadeo sin intervención de IA.
5. **Expressions** — neutral/happy/surprised/sad/angry y reset seguro.
6. **Lip-sync** — conducir visemas desde el audio TTS sin reconocimiento de texto. Una implementación open-source reciente (`three-vrm-lip-sync`) demuestra que puede hacerse analizando el audio localmente y escribiendo cinco visemas VRM (`aa/ih/ou/ee/oh`).
7. **Acting** — combinar emoción + mirada + pose + animación + voz sin que un subsistema destruya el estado de otro.
8. **Physics** — spring bones para cabello/ropa con límites de calidad.
9. **Performance** — registrar FPS, frame time, CPU y memoria; definir límites de calidad antes de integrar.
10. **Failure recovery** — VRM inválido, textura faltante, animación inválida, audio fallido y WebGL/context loss deben producir error visible y recuperable, no dejar la aplicación en un estado silenciosamente roto.

## Reglas de rendimiento

- No usar IA/LLM para idle, parpadeo, lip-sync o animaciones deterministas.
- No cargar un modelo externo automáticamente desde Internet en tiempo de ejecución.
- El avatar debe poder funcionar sin Ollama y sin API.
- Ollama sólo se consulta cuando una función realmente necesita inteligencia.
- Las APIs son fallback y nunca deben ser requisito para renderizar el avatar.
- Mantener un modo degradado 2D/placeholder si WebGL o VRM falla.

## Criterio de integración

No mover este renderer a `app/` hasta que las pruebas anteriores puedan ejecutarse de forma reproducible y los errores sean visibles para el usuario. El modelo final de Cari tampoco se incluirá hasta verificar su licencia de redistribución.
