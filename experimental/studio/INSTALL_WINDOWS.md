# Cari Studio — instalación Windows

## Estado actual

Esta rama es experimental y todavía no tiene un instalador .exe final. Para probarla en Windows hay que compilar el motor C++ y luego ejecutar el shell Electron.

Rama: fix/native-windows-foundation

## 1. Requisitos

- Git for Windows.
- Node.js LTS.
- Visual Studio / Build Tools con Desktop development with C++, MSVC x64/x86, Windows SDK y CMake Tools for Windows.
- CMake.
- FFmpeg local.

Microsoft indica que el workload Desktop development with C++ proporciona las herramientas necesarias para compilar C++ y que CMake Tools for Windows forma parte de esa configuración.

Fuentes oficiales:
- Git for Windows: https://git-scm.com/install/windows
- Visual Studio: https://visualstudio.microsoft.com/downloads/
- CMake: https://cmake.org/download/
- FFmpeg: https://ffmpeg.org/download.html
- Node.js: https://nodejs.org/

## 2. Descargar Cari Studio

PowerShell:

cd $HOME\Downloads
git clone -b fix/native-windows-foundation https://github.com/araragijona-coder/vtuber-cari.git
cd vtuber-cari

El repositorio es privado, así que GitHub debe autenticar tu cuenta con permisos sobre el repositorio.

Comprobar:

git status
git branch --show-current

Debe aparecer:

fix/native-windows-foundation

## 3. Comprobar herramientas

git --version
node --version
npm --version
cmake --version
ffmpeg -version

## 4. Compilar el motor Windows

cd experimental\studio\native-windows
cmake -S . -B build -A x64
cmake --build build --config Release --parallel
ctest --test-dir build -C Release --output-on-failure

El ejecutable esperado es:

experimental\studio\native-windows\build\Release\cari-studio-native.exe

## 5. Instalar dependencias Electron

cd ..\electron-shell
npm install
npm run check
npm test

## 6. Ejecutar Cari Studio

La forma recomendada es:

.\run-local.ps1

El launcher busca automáticamente el motor en:

experimental\studio\native-windows\build\Release\cari-studio-native.exe

También puedes definirlo manualmente:

$env:CARI_NATIVE_EXECUTABLE = "$(Resolve-Path ..\native-windows\build\Release\cari-studio-native.exe)"
npm start

## 7. FFmpeg

Cari Studio espera encontrar ffmpeg.exe en PATH.

Comprobar:

ffmpeg -version

Ruta manual:

$env:CARI_FFMPEG_EXECUTABLE = "C:\ruta\a\ffmpeg.exe"

## 8. Avatar y tracking

Son opcionales para iniciar.

$env:CARI_MEDIAPIPE_MODEL_PATH = "C:\ruta\a\face_landmarker.task"
$env:CARI_AVATAR_MODEL_PATH = "C:\ruta\a\avatar.glb"

Sin esas variables se mantiene el comportamiento de prueba/placeholder correspondiente.

## 9. OBS

OBS no es necesario para captura ni grabación del motor nativo. La integración OBS WebSocket es opcional.

## 10. Primer arranque

1. Comprueba que Cari Studio abre.
2. Comprueba la lista de ventanas.
3. Prueba captura de pantalla/ventana.
4. Prueba micrófono + audio del sistema.
5. Prueba el efecto de voz.
6. Prueba grabación local.
7. Revisa las métricas de captura/audio/output.
8. Registra cualquier error en BITACORA.md.

## 11. Pendientes conocidos

- PTS explícitos extremo a extremo en transporte A/V.
- Compositor avatar → frame final codificado.
- Compositor GPU D3D11 de producción.
- Cámara Media Foundation real.
- Game Capture.
- Drift correction.
- FFmpeg + named pipes sostenidos en Windows.
- RTMP real prolongado.
- Reconexión/backoff validada en máquina real.
- Lip-sync.
- Multistream.
- Validación del hardware objetivo.
- Instalador/paquete final.

## 12. Repetición segura

Antes de modificar una función, revisar experimental/studio/BITACORA.md y experimental/studio/AUDIT_MATRIX.md.