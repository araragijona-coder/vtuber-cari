# Cari Studio — distribución principal


Esta carpeta main/ contiene la distribución principal de Cari Studio.

## Instalación Windows

En PowerShell:

    Set-ExecutionPolicy -Scope Process Bypass
    .\INSTALL_WINDOWS.ps1

El instalador comprueba o instala Node.js LTS, CMake, Visual Studio Build Tools con C++/Windows SDK y FFmpeg externo; después compila C++ x64, ejecuta CTest, instala Electron y copia el runtime nativo a main/native/.

Para no instalar FFmpeg automáticamente: ` .\INSTALL_WINDOWS.ps1 -NoFfmpegInstall `
Para no lanzar al terminar: ` .\INSTALL_WINDOWS.ps1 -SkipLaunch `

## Ejecución

    .\RUN_CARI_STUDIO.ps1

## FFmpeg

El repositorio no redistribuye ffmpeg.exe. FFmpeg publica el código fuente y enlaces a builds de Windows de terceros. La mayor parte está bajo LGPL 2.1+, pero ciertas configuraciones/componentes pueden activar GPL. citeturn303405search0turn303405search1

El instalador usa el paquete externo Gyan.FFmpeg cuando falta. No se enlazan sus librerías dentro de Cari Studio.

## Avatar y tracking

Variables opcionales:

    $env:CARI_MEDIAPIPE_MODEL_PATH = "C:\ruta\face_landmarker.task"
    $env:CARI_AVATAR_MODEL_PATH = "C:\ruta\avatar.glb"

Sin modelo se mantiene el placeholder correspondiente. No se incluyen assets propietarios.

## OBS

OBS WebSocket es opcional; captura y output directo no dependen de OBS.

## Estado

Avance global: 63%.

Esta distribución es instalable como build local reproducible. Todavía no es production-ready. Siguen abiertos CI Windows observable, E2E Windows sostenido, PTS explícitos, eliminación del readback CPU definitivo, device-loss hardware, drift, RTMP prolongado/reconexión real, Game Capture, avatar final, lip-sync y validación del PC objetivo.

## Bitácora

La continuidad canónica está en `CARI_STUDIO_BITACORA.md`. Revisar `NO REPETIR` antes de tocar componentes.