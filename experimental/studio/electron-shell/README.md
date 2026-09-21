
# Cari Studio — continuidad actual

Cari Studio se está construyendo como una **plataforma de streaming de escritorio**, no como un simple backend técnico.

El objetivo visual actual es:
- experiencia tipo Twitch Studio;
- dashboard de emisión;
- preview central;
- chat/eventos;
- escenas;
- biblioteca de assets;
- editor VTuber;
- acciones creadas desde `＋ Nueva acción`;
- acciones iniciales Feliz, Triste, Hablar, Callar, Neutral y Enojada;
- imágenes PNG/JPG/WebP por acción;
- múltiples frames, loop, duración y transformaciones;
- activación desde UI y chat;
- persistencia y presets JSON.

### Implementado

Native Windows:
- Windows Graphics Capture de ventana/pantalla;
- D3D11;
- WASAPI mic/loopback;
- mixer temporal;
- voice DSP;
- FrameBridge;
- MediaClock/RealtimePacer;
- interleaver A/V;
- RawPipe;
- FFmpeg supervisor/output;
- lifecycle seguro.

Electron:
- shell seguro;
- NativeEngine;
- StudioSessionManager;
- OBS opcional;
- Twitch chat/EventSub;
- MediaPipe + FaceTrackingBridge;
- Three.js + GLTF/GLB;
- AvatarActionStore;
- editor visual de acciones;
- presets JSON;
- drag/drop de imágenes.

### Verificación

- ActionStore: CRUD/persistencia/import-export.
- renderer: sintaxis válida;
- action-store: sintaxis válida;
- contratos de IDs renderer/index: completos;
- smoke C++ portable de timing: PASS;
- prueba sintética FFmpeg: PASS en Linux.

### Pendientes principales

- compositor avatar/PNG → frame final del streaming;
- timestamps explícitos extremo a extremo;
- drift correction;
- cámara Media Foundation;
- Game Capture;
- FFmpeg sostenido en Windows;
- RTMP real + reconexión;
- validación del hardware objetivo;
- editor 3D completo;
- Live2D;
- multistream;
- instalador final.

La bitácora canónica de continuidad es:
`experimental/studio/BITACORA.md`

Usarla antes de rehacer cualquier componente.


### Backend GPU experimental

El ejecutable nativo conserva `raw-ffmpeg` como backend por defecto. Cuando el build se realizó con `CARI_ENABLE_LIBAV_OUTPUT=ON` y existen las librerías de desarrollo de FFmpeg, puede seleccionarse el camino experimental D3D11→Libav con:

```text
CARI_OUTPUT_BACKEND=libav-d3d11
```

Este camino usa el compositor D3D11 y frames pertenecientes al pool hardware de FFmpeg, evitando el readback CPU del frame final antes del encoder. La validación Windows/hardware continúa pendiente.

### Arranque local

Desde `tools/windows/Cari-Launch.bat` o `run-local.ps1`, el launcher busca el motor nativo en los builds conocidos. Si el ejecutable no existe y CMake no está disponible, `run-local.ps1` intenta usar el setup existente con `-SkipBuild -SkipNpm`, vuelve a descubrir CMake y continúa con el build. `-NoSetup` desactiva esa instalación automática cuando se necesita un entorno estrictamente controlado.

`run-local.ps1` busca primero `CARI_NATIVE_EXECUTABLE` y los builds conocidos. Si no encuentra `cari-studio-native.exe`, intenta generar un build Release x64 en `native-windows/build-launch`. Esto evita confundir la ausencia de artefactos locales con un fallo del motor.

Para una máquina sin toolchain, usar `Cari-Setup.ps1`; para una máquina ya preparada, `Cari-Launch.bat` es suficiente.