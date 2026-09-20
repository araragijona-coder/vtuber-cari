
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

La bitácora de continuidad es:
`experimental/studio/BITACORA_CARI_STUDIO.md`

Usarla antes de rehacer cualquier componente.
