# Cari Studio — Bitácora maestra de continuidad

**Última actualización:** 2026-09-21  
**Rama:** `fix/native-windows-foundation`  
**PR:** #2 — `fix: harden native Windows foundation`  
**Regla de continuidad:** antes de implementar algo, revisar esta bitácora y `AUDIT_MATRIX.md`. No rehacer una tarea marcada como IMPLEMENTADO o VERIFICADO salvo que exista nueva evidencia de regresión.

---

## 1. Reglas permanentes del proyecto

- Cari Studio debe funcionar localmente y no necesita IA para operar.
- La IA no participa en captura, tracking, movimiento, voz, output ni decisiones normales del runtime.
- El micrófono **nunca se activa automáticamente**.
- El botón **Hablar** es la única puerta para activar la entrada de micrófono/lip-sync.
- El modo automático solo puede significar movimiento determinista o lectura de actuación facial por cámara.
- OBS es integración opcional, no dependencia del runtime de Cari.
- Assets propietarios o generados no se incorporan al repositorio como parte del producto.
- Código incierto permanece en `experimental/` hasta validarlo.
- Nunca convertir “compila” en “funciona en hardware”.

---

## 2. Hecho y no repetir

### Arquitectura / runtime
- [IMPLEMENTADO] Electron Renderer como control visual.
- [IMPLEMENTADO] Electron Main como control plane.
- [IMPLEMENTADO] Motor Windows nativo C++.
- [IMPLEMENTADO] Comunicación JSONL stdin/stdout con correlación por ID.
- [IMPLEMENTADO] StudioSessionManager con serialización, rollback y reglas stop-only.
- [IMPLEMENTADO] OBS WebSocket opcional.

### Captura
- [IMPLEMENTADO] Windows Graphics Capture para ventana.
- [IMPLEMENTADO] Windows Graphics Capture para pantalla primaria.
- [IMPLEMENTADO] Enumeración de ventanas.
- [IMPLEMENTADO] Selección de ventana mediante índice.
- [IMPLEMENTADO] D3D11 + frame callback.
- [IMPLEMENTADO] Recreate del frame pool ante resize.
- [IMPLEMENTADO] Recuperación ante DXGI device removed/reset/hung.
- [PENDIENTE] Captura real de cámara mediante Media Foundation.
- [PENDIENTE] Game Capture dedicada.
- [PENDIENTE] Validación exhaustiva en hardware Windows.

### Audio
- [IMPLEMENTADO] WASAPI micrófono.
- [IMPLEMENTADO] WASAPI system loopback.
- [IMPLEMENTADO] AudioTimelineMixer.
- [IMPLEMENTADO] VoiceEffectProcessor local `anime-bright`.
- [IMPLEMENTADO] Normalización inicial de sample-rate/canales.
- [IMPLEMENTADO] Rechazo de cambios de formato durante output.
- [IMPLEMENTADO] Micrófono OFF al arrancar el motor de audio.
- [IMPLEMENTADO] Micrófono solo ON mediante `microphone.set` disparado por Hablar.
- [IMPLEMENTADO] Lip-sync local por amplitud, pero solo dentro del flujo iniciado por Hablar.
- [PENDIENTE] Drift correction/resampling de producción entre relojes físicos.
- [PENDIENTE] Procesamiento de voz pitch/formant real.

### A/V y output
- [IMPLEMENTADO] MediaClock en ticks de 100 ns.
- [IMPLEMENTADO] RealtimePacer contra reloj monotónico.
- [IMPLEMENTADO] Interleaver A/V global por PTS.
- [IMPLEMENTADO] Audio primero en empate de PTS.
- [IMPLEMENTADO] Colas acotadas.
- [IMPLEMENTADO] Límite de 8 eventos por polling.
- [IMPLEMENTADO] Backpressure durante handshake de named pipes.
- [IMPLEMENTADO] FFmpeg A/V output con pipes independientes.
- [IMPLEMENTADO] Cierre EOF/flush antes de terminación forzada.
- [IMPLEMENTADO] Estado/código de salida FFmpeg.
- [IMPLEMENTADO] stderr limitado a 256 KiB.
- [IMPLEMENTADO] Clasificación básica de fallos de output.
- [IMPLEMENTADO] Política de retry exponencial acotada.
- [IMPLEMENTADO] Retry reservado a fallos clasificados como red.
- [PENDIENTE] PTS explícitos extremo a extremo dentro del transporte raw.
- [PENDIENTE] Validación sostenida named pipes + FFmpeg en Windows.
- [PENDIENTE] Grabación prolongada real.
- [PENDIENTE] RTMP real contra plataforma.
- [PENDIENTE] Reconexión completa probada en plataforma real.
- [PENDIENTE] Diagnóstico estructurado de stderr más allá de categorías básicas.

### Avatar / tracking
- [IMPLEMENTADO] AvatarActingBridge separado de apariencia.
- [IMPLEMENTADO] Contrato normalizado de expresión, pose y gaze.
- [IMPLEMENTADO] Three.js + GLTFLoader.
- [IMPLEMENTADO] Placeholder procedural completo para validar runtime.
- [IMPLEMENTADO] MediaPipe Face Landmarker como adaptador local.
- [IMPLEMENTADO] Guardia de timestamps crecientes para Face Landmarker VIDEO.
- [IMPLEMENTADO] Actividad manual/automática.
- [IMPLEMENTADO] Intensidad `quieta / normal / inquieta`.
- [IMPLEMENTADO] Estados de brazos.
- [IMPLEMENTADO] Objetos `nada / teléfono / joystick / teclado / almohada`.
- [IMPLEMENTADO] Modos completos:
  - `gaming-angry-happy`
  - `keyboard-tired-focused`
  - `pillow-hug-sleeping`
- [IMPLEMENTADO] Expresión `focused` para modo teclado.
- [PENDIENTE] Composición final del avatar dentro del frame nativo codificado.
- [PENDIENTE] Lip-sync de producción unido al pipeline nativo sin doble captura.
- [PENDIENTE] Modelo Cari final proporcionado por el usuario.
- [PENDIENTE] Live2D como backend real.

### Chibis
- [IMPLEMENTADO] Mapa de preview local.
- [IMPLEMENTADO] Capibaras procedurales.
- [IMPLEMENTADO] Mini-Cari procedural.
- [IMPLEMENTADO] Movimiento determinista alrededor de Cari.
- [IMPLEMENTADO] Límite de hasta 8 unidades en el preview.
- [PENDIENTE] Composición de chibis dentro del frame de streaming.
- [PENDIENTE] Assets finales si se reemplaza el arte procedural.
- [NO REPETIR] No convertir esto en física compleja salvo que aparezca una necesidad real; el objetivo es decoración ligera.

### UI / control
- [IMPLEMENTADO] Controles manuales de expresión.
- [IMPLEMENTADO] Controles manuales de actividad.
- [IMPLEMENTADO] Botón Hablar explícito.
- [IMPLEMENTADO] Modo automático de movimiento.
- [IMPLEMENTADO] Modo de lectura por cámara.
- [IMPLEMENTADO] Controles de objetos.
- [IMPLEMENTADO] Botones para modos completos.
- [IMPLEMENTADO] Métricas de output/retry/pacing.
- [PENDIENTE] Editor visual completo de presets de actividad.
- [PENDIENTE] Control remoto móvil real.
- [PENDIENTE] Sistema de hotkeys específico para todas las nuevas actividades.

---

## 3. Decisiones clave sobre micrófono

**No se debe implementar VAD como puerta de apertura de micrófono.**

El análisis de nivel puede existir únicamente después de que el usuario haya presionado **Hablar**, para animar boca/lip-sync. El runtime nativo comienza con el micrófono deshabilitado.

Flujo obligatorio:

```
Audio engine ON
    |
    +--> system loopback = permitido
    |
    +--> microphone = OFF
             |
          [HABLAR]
             |
             v
        microphone ON
             |
        local lip-sync
```

Al salir de Hablar:

```
microphone OFF
lip-sync reset
speech monitor detenido
```

Nunca usar “ruido detectado” para abrir el micrófono.

---

## 4. Modos de actividad actuales

### Manual
El usuario controla explícitamente:
- actividad;
- intensidad;
- brazos;
- objeto;
- expresión;
- pose.

### Auto movimiento
No usa IA.
- teclado: actividad según eventos de teclado;
- mando: actividad según gamepad;
- idle: vuelve a estado normal.

### Lectura por cámara
No usa IA generativa.
- MediaPipe detecta landmarks/blendshapes;
- FaceTrackingBridge traduce a pose/gaze/expresión;
- el usuario conserva el control de activar/desactivar cámara.

### Modos completos

```
gaming-angry-happy
  joystick
  inquieta
  brazos controller
  angry <-> happy

keyboard-tired-focused
  teclado
  quieta
  brazos keyboard
  exhausted <-> focused

pillow-hug-sleeping
  almohada
  quieta
  brazos hug
  exhausted -> sleeping
```

---

## 5. Chibis — coste esperado

La implementación actual es deliberadamente barata: canvas 2D, geometría simple, movimiento determinista y máximo 8 unidades.

El coste real no depende tanto de “tener 3 capibaras”, sino de:
- cantidad de draw calls;
- resolución de texturas;
- modelos skinned;
- sombras;
- postprocesado;
- física;
- animaciones complejas;
- composición final GPU.

Regla de proyecto: comenzar con chibis procedurales/2D; no usar modelos 3D pesados para decoración.

---

## 6. Pruebas ya realizadas

- [VERIFICADO] C++20 portable con `-Wall -Wextra -Werror`: contratos del scheduler.
- [VERIFICADO] RealtimePacer.
- [VERIFICADO] MediaInterleaver.
- [VERIFICADO] AudioTimelineMixer previo.
- [VERIFICADO] Session/avatar tests previos.
- [VERIFICADO] FFmpeg 7.1.5 sintético BGRA raw + PCM float32 -> H.264/AAC -> Matroska.
- [PENDIENTE DE NUEVA EJECUCIÓN] Nuevos tests de activity/privacy.
- [PENDIENTE] Build Windows completo en runner funcional.
- [PENDIENTE] Hardware real del PC objetivo.

---

## 7. CI — bloqueo conocido

Los workflows fueron modificados para aceptar la rama de desarrollo y `workflow_dispatch`.

Sin embargo, los runs recientes continúan terminando antes de ejecutar steps:
- jobs con `steps=null`;
- algunos runs terminan con `logs_url=null`.

Esto se ha observado repetidamente incluso después de reintentar workflows.

**No volver a investigar el mismo fallo desde el código hasta que exista una nueva evidencia de runner/log.**

---

## 8. Historial de problemas ya corregidos

- [RESUELTO] Conversión incorrecta UTF-8/UTF-16 para rutas Windows en FFmpeg.
- [RESUELTO] timestamp WASAPI tratado incorrectamente como QPC crudo.
- [RESUELTO] parser JSONL con string mal escapado.
- [RESUELTO] renderer file:// construido de forma insegura.
- [RESUELTO] Face Landmarker con timestamps no crecientes.
- [RESUELTO] despacho A/V separado por tipo en lugar de por PTS global.
- [RESUELTO] cambios silenciosos de sample-rate/canales.
- [RESUELTO] acumulación ilimitada de stderr.
- [RESUELTO] consumo de audio antes de conectar named pipes.
- [RESUELTO] cambios de captura/audio durante output.
- [RESUELTO] auto que podía encender micrófono.
- [RESUELTO] estado output mal serializado.
- [RESUELTO] retry indiscriminado sustituido por retry solo para categoría network.

---

## 9. Intentos descartados

- [DESCARTADO] Duplicar infraestructura de OBS como dependencia obligatoria.
- [DESCARTADO] Meter IA en el runtime principal.
- [DESCARTADO] Abrir micrófono automáticamente mediante VAD.
- [DESCARTADO] Inferir intención del usuario para decidir comportamiento del avatar.
- [DESCARTADO] Componer avatar final mediante capturas de pantalla periódicas como solución de producción.
- [DESCARTADO] Tratar el scheduler como preservación exacta de PTS: actualmente solo pacea la emisión.
- [DESCARTADO] Copiar implementación de proyectos externos cuando la licencia no permita hacerlo.
- [NO REPETIR] No volver a “solucionar” los puntos descartados sin cambiar primero la evidencia o los requisitos.

---

## 10. Próxima prioridad técnica

Orden recomendado por dependencia:

1. transporte A/V con timestamps explícitos;
2. compositor GPU/nativo para avatar + chibis;
3. cámara Media Foundation;
4. drift correction;
5. FFmpeg sostenido en Windows;
6. output RTMP real + reconexión;
7. lip-sync final;
8. control remoto móvil;
9. multistream;
10. empaquetado/instalador.

No avanzar multistream antes de demostrar estabilidad de una salida única.

---

## 11. Estado global

**Estimación de ingeniería:** ~61%.

Esto representa avance de implementación, no una certificación de producto listo para producción.

```
Implementado      ███████████████████████░░░░░  ~61%
Verificado        ████████████████░░░░░░░░░░░░  menor que implementación
Hardware validado ███░░░░░░░░░░░░░░░░░░░░░░░░  pendiente
```

### Regla final

Antes de agregar código:
1. buscar el componente en esta bitácora;
2. revisar `AUDIT_MATRIX.md`;
3. buscar tests existentes;
4. reutilizar lo existente;
5. modificar solo si hay un gap concreto;
6. registrar el cambio aquí después de implementarlo.

**Esta bitácora es la fuente de continuidad del proyecto.**
