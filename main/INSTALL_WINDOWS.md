# Cari Studio — instalación Windows

## Resultado esperado

`INSTALL_WINDOWS.ps1` prepara una instalación local reproducible:

1. verifica o instala Node.js LTS;
2. verifica o instala CMake;
3. verifica o instala Visual Studio Build Tools con C++/Windows SDK;
4. verifica o instala FFmpeg externo;
5. configura CMake x64;
6. compila el runtime nativo;
7. ejecuta CTest;
8. instala dependencias Electron;
9. ejecuta `npm run check` y `npm test`;
10. copia el runtime nativo a `main/native/`;
11. configura variables de entorno de usuario;
12. opcionalmente inicia Cari Studio.

## Requisitos

Windows x64, conexión a Internet para instalar dependencias que falten y permisos suficientes para WinGet/Build Tools.

## Comando

```powershell
cd .\main
Set-ExecutionPolicy -Scope Process Bypass
.\INSTALL_WINDOWS.ps1
```

Para no instalar FFmpeg automáticamente:

```powershell
.\INSTALL_WINDOWS.ps1 -NoFfmpegInstall
```

Para instalar sin lanzar la aplicación:

```powershell
.\INSTALL_WINDOWS.ps1 -SkipLaunch
```

## Ejecutar

```powershell
.\RUN_CARI_STUDIO.ps1
```

## FFmpeg y licencias

Cari Studio no incorpora `ffmpeg.exe` dentro del repositorio. La instalación usa una build externa. Esto evita publicar accidentalmente una combinación de componentes FFmpeg/codec cuya licencia no haya sido seleccionada para redistribución.

FFmpeg indica que su código es mayormente LGPL 2.1+, mientras que componentes opcionales pueden tener GPL. La página oficial también enlaza builds de Windows de terceros. citeturn303405search0turn303405search1

## Avatar

Variables opcionales:

```powershell
$env:CARI_MEDIAPIPE_MODEL_PATH = "C:\ruta\face_landmarker.task"
$env:CARI_AVATAR_MODEL_PATH = "C:\ruta\avatar.glb"
```

Sin esos archivos se conserva el modo placeholder/degradado.

## Validación de hardware

El instalador compila y ejecuta tests, pero eso no sustituye la validación de Windows/PC objetivo. El script `native-windows/validate-windows.ps1` conserva evidencia de build, CTest y E2E para cerrar esos gates.

## Estado

El programa es instalable como **self-build Windows reproducible**.

Todavía NO es un instalador de producción firmado.

Avance global: **63%**.
