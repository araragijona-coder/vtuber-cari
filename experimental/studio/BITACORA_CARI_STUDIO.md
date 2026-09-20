# Bitácora de Cari Studio

Fecha de actualización: 2026-09-20
Rama: `fix/native-windows-foundation`
PR: #2

## Objetivo real del producto

Cari Studio no es solamente un backend de streaming ni un clon interno de OBS.

El producto objetivo es una **plataforma de streaming de escritorio estilo Twitch Studio**, con una experiencia visual propia y un **editor de VTuber** integrado.

La experiencia objetivo incluye:

- panel de emisión y diagnóstico;
- preview central del VTuber;
- chat y eventos;
- escenas;
- biblioteca de assets;
- editor de acciones del VTuber;
- botón `＋ Nueva acción`;
- acciones como `Feliz`, `Triste`, `Hablar`, `Callar`, `Neutral`, `Enojada`;
- una o varias imágenes PNG/JPG/WebP por acción;
- orden de frames;
- duración por frame;
- loop;
- escala, opacidad y posición del asset;
- activación de acciones desde la interfaz;
- activación de acciones desde comandos del chat;
- presets JSON exportables/importables;
- funcionamiento local sin IA obligatoria;
- OBS opcional, no obligatorio.

## Regla de estados

Cada tarea usa tres estados:

- **IMPLEMENTADO:** existe código integrado.
- **VERIFICADO:** existe una prueba reproducible que lo ejecutó y pasó.
- **VALIDADO EN HARDWARE:** probado sobre el entorno Windows/PC objetivo.

No se convierte automáticamente un estado en otro.

---

## Registro histórico resumido

### 001 — Fundación Windows nativa
Estado: IMPLEMENTADO / VERIFICACIÓN PARCIAL

Construido:

- Win32 host;
- D3D11;
- Windows Graphics Capture;
- captura de ventana;
- captura de pantalla primaria;
- enumeración de ventanas;
- recuperación de device loss;
- FrameBridge.

No repetir:
- no volver a diseñar la captura de pantalla/ventana desde cero salvo que aparezca evidencia de una regresión.

Pendiente:
- hardware real;
- cámara Media Foundation;
- Game Capture.

### 002 — Audio nativo
Estado: IMPLEMENTADO / VERIFICACIÓN PARCIAL

Construido:

- WASAPI microphone;
- system loopback;
- VoiceEffectProcessor;
- AudioTimelineMixer;
- timeline de audio;
- normalización de sample-rate/canales;
- métricas de underrun/resampling/mix.

No repetir:
- no reimplementar el mixer temporal antes de comprobar las métricas y pruebas existentes.

Pendiente:
- drift correction entre relojes físicos;
- validación real prolongada.

### 003 — FFmpeg y lifecycle
Estado: IMPLEMENTADO / VERIFICACIÓN PARCIAL

Construido:

- ProcessRunner;
- FFmpeg supervisor;
- captura stderr;
- named pipes raw;
- FFmpeg A/V output;
- cierre EOF/flush;
- terminación forzada como fallback;
- estados de proceso;
- código de salida;
- límites de stderr.

No repetir:
- no volver a crear otro supervisor paralelo;
- no tratar OBS como dependencia del output directo.

Pendiente:
- FFmpeg sostenido en Windows;
- RTMP real;
- clasificación estructurada más precisa;
- reconexión/backoff validada.

### 004 — Tiempo y sincronización A/V
Estado: IMPLEMENTADO / VERIFICACIÓN PORTABLE

Construido:

- MediaClock;
- RealtimePacer;
- colas acotadas;
- interleaver global por PTS;
- desempate audio;
- late-drop de vídeo;
- métrica de audio tardío;
- rechazo de cambios de formato;
- límite de 8 eventos A/V por polling;
- backpressure de arranque.

No repetir:
- no volver a implementar un segundo scheduler sin demostrar primero que el actual no satisface una nueva necesidad.

Pendiente:
- timestamps explícitos extremo a extremo;
- drift correction;
- validación sostenida real.

### 005 — Shell Electron
Estado: IMPLEMENTADO

Construido:

- BrowserWindow seguro;
- contextIsolation;
- nodeIntegration desactivado;
- sandbox;
- preload con wrappers explícitos;
- NativeEngine;
- request/response correlacionado;
- OBS WebSocket opcional;
- Twitch chat/eventos;
- permisos locales de cámara.

No repetir:
- no exponer `ipcRenderer` completo;
- no mover el spawning nativo al renderer;
- no convertir OBS en dependencia.

### 006 — Avatar y tracking
Estado: IMPLEMENTADO / VERIFICACIÓN PARCIAL

Construido:

- AvatarActingBridge;
- avatar contract normalizado;
- Three.js;
- GLTFLoader;
- GLB/glTF externo;
- placeholder técnico;
- MediaPipe Face Landmarker adapter;
- FaceTrackingBridge;
- lip-sync local básico;
- overlay window opcional.

No repetir:
- no generar assets propietarios dentro del repositorio;
- no acoplar la apariencia al estado de actuación.

Pendiente:
- compositor nativo del avatar;
- lip-sync final;
- validación de rendimiento;
- modelo final;
- Live2D adapter.

---

## 007 — Cambio de producto visual: Studio real

Estado: IMPLEMENTADO

Este es el cambio importante que corrige la dirección del proyecto.

La interfaz anterior era principalmente una consola técnica con botones de captura y diagnóstico.

Ahora existe una interfaz estructurada como Studio:

```
┌──────────────────────────────────────────────────────────────┐
│ Cari Studio       LIVE / OFFLINE       Motor / Transmitir   │
├────────────┬───────────────────────────────┬───────────────┤
│ En vivo    │                               │ Control       │
│ Panel      │        Preview VTuber         │ rápido        │
│ VTuber     │        + action overlay       │ Stream        │
│ Escenas    │                               │ Avatar        │
│ Chat       │        cámara / tracking      │ Diagnóstico   │
│ Eventos    │                               │               │
│ Assets     │                               │               │
│ Settings   │                               │               │
└────────────┴───────────────────────────────┴───────────────┘
```

Componentes creados:

- navegación tipo Studio;
- vista En vivo;
- vista Panel;
- vista VTuber;
- vista Escenas;
- vista Chat;
- vista Eventos;
- vista Assets;
- vista Configuración;
- preview con canvas Three.js;
- overlay de acción;
- controles rápidos de acción.

Archivos principales:

- `renderer/index.html`
- `renderer/styles.css`
- `renderer/main.js`

### 007.1 — Editor de acciones
Estado: IMPLEMENTADO

Existe:

- `＋ Nueva acción`;
- acciones iniciales:
  - Neutral
  - Feliz
  - Triste
  - Hablar
  - Callar
  - Enojada
- selección de acción;
- nombre editable;
- icono editable;
- expresión base;
- boca;
- duración por frame;
- loop;
- escala;
- opacidad;
- offset X/Y;
- duplicar;
- eliminar.

### 007.2 — Assets por acción
Estado: IMPLEMENTADO

Cada acción permite:

- agregar PNG;
- agregar JPG;
- agregar WebP;
- arrastrar archivos al dropzone;
- múltiples imágenes;
- hasta 24 frames;
- reordenar frame arriba/abajo;
- eliminar frame;
- preview inmediato;
- persistencia local.

Las imágenes se convierten a Data URL y se almacenan en el preset local.

### 007.3 — Presets
Estado: IMPLEMENTADO

Existe:

- exportación `cari-actions.json`;
- importación del mismo formato;
- validación básica de versión;
- persistencia mediante localStorage;
- restauración automática al iniciar.

### 007.4 — Chat → acción
Estado: IMPLEMENTADO

Comandos soportados:

- `!feliz`
- `!triste`
- `!hablar`
- `!callar`
- `!enojada`
- `!neutral`

También existen alias en inglés para compatibilidad.

### 007.5 — Animación por frames
Estado: IMPLEMENTADO / VERIFICACIÓN PENDIENTE

Una acción con varios frames puede reproducirse en loop usando su duración por frame.

No afirmar todavía que sea una animación de producción: falta prueba prolongada y sincronización con la composición final.

---

## 008 — Action Store
Estado: IMPLEMENTADO / PRUEBA AGREGADA

Archivo:

`electron-shell/avatar/action-store.js`

Responsabilidades:

- CRUD de acciones;
- persistencia;
- normalización;
- límites de seguridad;
- frames;
- import/export;
- duplicado.

Prueba agregada:

`electron-shell/test/action-store.test.mjs`

Cubre:

- acciones iniciales;
- persistencia;
- export/import;
- eliminación y operaciones de frames.

No repetir:
- no implementar otro almacenamiento paralelo para las acciones.

---

## 009 — CI
Estado: IMPLEMENTADO / BLOQUEADO POR RUNNER

Se ajustaron workflows para que también puedan ejecutarse sobre la rama de desarrollo y manualmente.

La evidencia actual de GitHub Actions sigue mostrando:

- jobs con `failure`;
- `steps = null`;
- en algunos matrices un job cancela después del fallo del otro;
- no existe evidencia de que CMake/npm/test haya llegado a ejecutarse.

No repetir:
- no asumir que un fallo de Actions implica fallo del código cuando el job muere antes de ejecutar steps.

Pendiente:
- runner operativo;
- build Windows real;
- pruebas Electron;
- artefacto portable exitoso.

---

# NO REPETIR — inventario consolidado

No rehacer estas piezas sin evidencia nueva:

1. Windows Graphics Capture de ventana/pantalla.
2. Enumeración de ventanas.
3. FrameBridge base.
4. WASAPI mic/loopback.
5. AudioTimelineMixer.
6. VoiceEffectProcessor básico.
7. MediaClock.
8. RealtimePacer.
9. MediaInterleaver.
10. bounded queues.
11. FFmpeg ProcessRunner.
12. FFmpeg supervisor.
13. raw named pipes.
14. NativeMediaOutputBridge.
15. NativeEngine.
16. StudioSessionManager.
17. avatar contract.
18. AvatarActingBridge.
19. Three.js renderer.
20. MediaPipe Face Landmarker adapter.
21. OBS WebSocket optional bridge.
22. Twitch chat/EventSub base.
23. nuevo shell técnico anterior.
24. Action Store.
25. editor básico de acciones.
26. persistencia local de acciones.

Antes de modificar uno de estos componentes, la próxima auditoría debe comprobar primero esta bitácora y el código actual.

---

# NO CONFUNDIR

### Existe pero falta validar
- FFmpeg A/V continuo.
- RTMP continuo.
- named pipes bajo carga.
- tracking sostenido.
- overlay final dentro de la señal codificada.

### Está parcialmente hecho
- compositor de avatar;
- cámara;
- lip-sync;
- streaming robusto;
- escenas;
- eventos;
- editor visual completo.

### Todavía no existe como producto final
- compositor GPU de producción;
- Game Capture;
- cámara Media Foundation integrada al pipeline final;
- multistream;
- instalador final;
- asset catalog definitivo;
- Live2D runtime;
- configuración completa de proyecto.

---

# Próxima cola recomendada de ingeniería

1. Compositor de avatar → frame final.
2. Transporte A/V con timestamps explícitos.
3. Prueba end-to-end FFmpeg sobre Windows.
4. Cámara Media Foundation.
5. Game Capture.
6. Drift correction.
7. RTMP/reconnect real.
8. Editor de escenas más completo.
9. Integración de acciones con el compositor nativo.
10. Validación del PC objetivo.
11. Instalador/distribución.
12. Promoción de componentes fuera de `experimental/` solo después de pasar gates.

---

# Regla final de la bitácora

**No medir avance por cantidad de archivos o commits.**

Una pieza solo sube de estado cuando obtiene evidencia nueva.

**No rehacer por comodidad. Mejorar solamente cuando exista una razón técnica, una regresión demostrada o un gate pendiente que requiera cambiar la arquitectura.**
