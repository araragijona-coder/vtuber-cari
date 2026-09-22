# Cari Studio / Engineering Log

Registro acumulativo para evitar repetir auditorías y trabajos ya realizados.

## 2026-09-22 — Scavenger Protocol / webapp game mechanics

### Objetivo
Investigar mecánicas ligeras de juegos web reales y crear adaptaciones originales, sin dependencias pesadas, para el módulo `/webapp/js/scavenged/`.

### Investigación realizada
- Rolling Scopes School, ejercicio "Not Fight Club": combate por turnos, ataque/defensa, críticos y registro de batalla. Fuente: GitHub.
- Asteroids Redux: Canvas vanilla, colisiones y limpieza de partículas. Fuente: GitHub.
- Bubble Panic: partículas, delta-time y arquitectura de estados en Canvas vanilla. Fuente: GitHub.
- Space Shooter: Canvas sin dependencias, dificultad progresiva y partículas. Fuente: GitHub.
- RouteLab: selección determinista de objetivos y comparación de selectores. Fuente: GitHub.

### Implementado
- `webapp/js/scavenged/combat-engine.js`: resolución de ataque, mitigación, variación, críticos y derrota.
- `webapp/js/scavenged/target-selector.js`: selección por distancia + adaptación de pointer/touch a Canvas.
- `webapp/js/scavenged/impact-particles.js`: partículas acotadas, vida útil y limpieza.
- `webapp/js/scavenged/arcade-loop.js`: bucle requestAnimationFrame con delta-time limitado.
- `webapp/js/scavenged/index.js`: entrada única de módulos.
- `webapp/js/scavenged/README.md`: procedencia conceptual, límites y estado.

### Decisiones de legalidad/reutilización
- No se copió código fuente de los repositorios investigados.
- Las implementaciones son nuevas y solo reutilizan patrones mecánicos generales.
- No se añadieron React, Vue, Three.js ni dependencias runtime.
- No se añadió código de captura Windows/audio nativo/3D pesado: queda explícitamente fuera de este frente.

### Estado de validación
- IMPLEMENTADO: módulos aislados.
- NO INTEGRADO: no existe todavía una Mini App Telegram en el repositorio actual donde conectarlos.
- NO VALIDADO EN NAVEGADOR/MÓVIL: falta ejecutar el módulo dentro de la UI real.

### NO REPETIR
- No volver a investigar desde cero críticos/ataque-defensa, selector de objetivos Canvas, partículas básicas Canvas o delta-time básico para este módulo.
- Próximo trabajo útil: localizar/crear el punto real de integración de la Mini App, añadir tests de comportamiento y conectar estas APIs al estado de batalla/UI.

### Nota de repositorio
El único repositorio accesible de la cuenta en esta sesión es `araragijona-coder/vtuber-cari`; por eso el módulo quedó aislado en `/webapp/js/scavenged/` y no se ha fingido que ya está conectado a un bot/Mini App Telegram inexistente en este repo.
