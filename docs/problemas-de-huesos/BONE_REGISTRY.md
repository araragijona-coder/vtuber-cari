# MACH-GIRLS — BONE REGISTRY

STATUS GENERAL: AUDIT IN PROGRESS

Este registro contiene los riesgos encontrados durante la auditoría arquitectónica.

# BONE-001 — INPUT SPAM / ACTION SYNCHRONIZATION
STATUS: GREEN / VERIFIED
Riesgo inicialmente identificado: el input de jugador podía alcanzar GameActions y CombatEngine mientras Presentation seguía reproduciendo una secuencia transitoria.
Tratamiento implementado: LOCK de acciones de jugador dependiente del estado real de CombatPresentation. Mientras Presentation está ocupada, CARD, BURST y ABILITY son rechazadas antes de llegar a GameActions/CombatEngine.
Recovery: el lock se mantiene hasta que Presentation deja de estar ocupada; no depende de un timeout artificial.
No se implementó una cola de acciones.
Evidencia de implementación: candidato verificado 35e9456ae7816d48b4f5b2d0dabe125e670e07e3; promoción funcional aplicada sobre mach-girls-2.5d.
Evidencia de validación histórica del candidato: CI remoto RUN 37807078957 / JOB 113414062871; test "BONE-001 locks rapid player combat input during active presentation and reopens after recovery" = PASS.
Estado actual: BONE-001 cerrado y verificado; la validación del HEAD promovido queda registrada por CI posterior a la promoción.

# BONE-002 — VISUAL LIFECYCLE / DISPOSE
STATUS: AMBER
No se encontró una API general dispose()/destroy() en la superficie auditada de CombatPresentation/Scene.
Hay cachés de imágenes, actores, efectos, listeners y una escena persistente asociada a la presentación.
Riesgo: referencias retenidas y crecimiento de memoria al añadir Garage, Story y Deckbuilding.
Tratamiento: definir lifecycle create → mount → active → pause → dispose.
Nota: mientras el runtime siga usando Canvas 2D, no asumir problemas de VRAM propios de WebGL.

# BONE-003 — EVENT CONTRACT / OBSERVABILITY
STATUS: AMBER
Ya existe un mecanismo basado en combat.events + MachGirlsPresentationEvents + CombatPresentation.consumeCombatEvents().
Por tanto, no es correcto clasificar el runtime actual como puro polling.
Riesgo restante: no existe todavía una autoridad general claramente documentada para separar GAMEPLAY EVENTS, PRESENTATION EVENTS, UI EVENTS y SYSTEM EVENTS.
Tratamiento: auditar primero el contrato existente antes de introducir un Event Bus nuevo. Evitar duplicar combat.events + EventBus + Dispatcher sin necesidad.
GREEN: una autoridad única de eventos y contrato documentado de consumo.

# BONE-004 — RNG DETERMINISM
STATUS: GREEN / VERIFIED
El repositorio contiene CombatRNG con normalizeSeed(), create(seed), next(), float(), chance() e int().
Las resoluciones consumen estado RNG explícito.
Conclusión: el riesgo de no tener seeded RNG ya está atendido.
No implementar otro RNG ni usar Math.random() dentro del Gameplay Core.

# BONE-005 — GLOBAL WINDOW / PUBLIC STATE
STATUS: AMBER
Los módulos están encapsulados en IIFE, pero exponen APIs públicas mediante window.GameState, window.CardSystem, window.CombatEngine, window.CariCombat y window.CombatPresentation.
getGameState() permite obtener el estado actual desde una superficie pública del entrypoint.
Riesgo real: superficie pública grande, mutadores potencialmente accesibles y fuerte acoplamiento global.
Esto no convierte al cliente web en una autoridad anti-cheat. La seguridad del cliente no debe tratarse como seguridad de servidor.
Tratamiento: auditar cada API como PUBLIC READ, PUBLIC COMMAND o INTERNAL ONLY.
GREEN: cambios de estado concentrados en comandos y reglas válidas con mínima superficie pública.

# BONE-006 — ENTRYPOINT / UI SPRAWL
STATUS: AMBER
combat.js concentra bootstrap, loop, HUD, hand, input de cartas, Burst, Ability, telemetry e integración con Presentation.
app.js concentra Telegram, DatabaseManager, SaveManager, RewardSystem, ProgressionSystem y reward/progression UI.
No existe UIManager dedicado.
Riesgo: al crecer Garage, Story, Collection y Relationships el entrypoint puede volverse monolítico.
Tratamiento: definir una frontera de UI antes de que el entrypoint crezca.
GREEN: separación clara sin duplicar GameState ni crear un segundo controller de combate.

# BONE-007 — DOCUMENTATION ↔ RUNTIME DRIFT
STATUS: RED
La documentación auditada describe hand limit 4 y un fixed deck de 7 en su baseline, mientras el runtime actual usa handLimit 5 por defecto y INITIAL_DECK contiene 9 cartas.
Riesgo: Cerebro, Obrero, tests y runtime pueden operar con contratos distintos.
Tratamiento: reconciliar CODE ↔ DESIGN DOCS ↔ TESTS mediante una decisión explícita; no elegir valores arbitrariamente.
GREEN: un único contrato verificable y documentación sincronizada.

# BONE-008 — SAVE SCHEMA EVOLUTION
STATUS: AMBER
bosozoku_player_save usa CURRENT_SAVE_VERSION = 1 y el migrador actual no contiene una cadena real de migraciones futuras.
Riesgo: Garage, deckbuilding, collection o relationships pueden romper saves existentes.
Tratamiento: diseñar versionado y cadena de migraciones antes de ampliar el save.
GREEN: migraciones y tests de compatibilidad documentados.

# BONE-009 — SINGLE TIME AUTHORITY
STATUS: AMBER
CombatClock y CombatEngine.advanceTime() son la autoridad temporal del gameplay. Presentation utiliza timestamps para curvas visuales.
Riesgo: futuras implementaciones podrían añadir timers de gameplay paralelos.
Tratamiento: un único reloj para gameplay; Presentation consume tiempo y no inventa simulación paralela.
GREEN: pruebas que demuestren que sistemas nuevos respetan la misma autoridad temporal.

# BONE-010 — SCRIPT LOAD ORDER
STATUS: AMBER
El runtime utiliza window.* y un orden explícito en index.html.
Riesgo: mover scripts por limpieza o refactor puede romper dependencias aunque cada archivo siga siendo sintácticamente válido.
Tratamiento: documentar dependency order y añadir verificaciones de bootstrap antes de reorganizar.
GREEN: contrato verificable de dependencias.

# BONE-011 — RENDERING AUTHORITY / DOUBLE DRAW
STATUS: AMBER
Existe Scene + SceneRenderer, pero CombatPresentation también contiene rutinas de dibujo como drawFighter, drawMotorcycle, drawAttack, drawImpact, drawBreak y drawBurst.
La composición actual funciona, pero la responsabilidad visual sigue parcialmente centralizada en CombatPresentation.
Riesgo: futuras capas podrían dibujar dos veces un mismo elemento.
Tratamiento: definir una única autoridad de render para CHARACTER, VEHICLE, VFX y HUD.
GREEN: una sola ruta de render por categoría visual.

# HEALTH SUMMARY
BONE-001 GREEN / VERIFIED
BONE-002 AMBER
BONE-003 AMBER
BONE-004 GREEN / VERIFIED
BONE-005 AMBER
BONE-006 AMBER
BONE-007 RED
BONE-008 AMBER
BONE-009 AMBER
BONE-010 AMBER
BONE-011 AMBER

# GATE
No comenzar una gran fase de contenido nuevo mientras RED > 0.
Cuando RED = 0, revisar de nuevo todos los AMBER y convertir cada riesgo crítico en GREEN o marcarlo explícitamente como OUTSIDE-SCOPE con una razón documentada.

# PRINCIPIO
No queremos que el juego funcione solo porque los tests actuales pasan. Queremos contratos estructurales claros antes de hacerlo crecer.