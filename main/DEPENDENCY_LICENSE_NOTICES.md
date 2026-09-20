# Cari Studio — avisos de dependencias

## FFmpeg

Cari Studio ejecuta FFmpeg como proceso externo y no redistribuye un binario FFmpeg dentro del repositorio.

FFmpeg documenta que la mayor parte de su código está bajo LGPL 2.1+, aunque algunas partes opcionales están bajo GPL según la configuración. La página oficial de descargas publica enlaces a builds de Windows mantenidas por terceros. citeturn303405search0turn303405search1

La instalación actual obtiene FFmpeg mediante WinGet como dependencia externa. La build seleccionada puede tener una licencia distinta de la licencia base del proyecto FFmpeg; por eso el binario no se copia al repositorio ni se presenta como parte de la distribución fuente de Cari Studio.

## JavaScript

Electron, Three.js, MediaPipe Tasks Vision y OBS WebSocket se instalan desde `main/electron-shell/package.json`.

Cualquier cambio de versión debe acompañarse de una revisión de licencia y del lockfile correspondiente cuando se añada uno.

## Assets

No se incluyen modelos Live2D propietarios, modelos VRM comerciales, texturas privadas ni credenciales.
