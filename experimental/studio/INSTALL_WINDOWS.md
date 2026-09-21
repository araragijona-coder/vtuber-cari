# Cari Studio — instalación Windows

## Ruta automática recomendada

Esta rama sigue siendo experimental, pero ya no es necesario instalar cada dependencia manualmente.

Desde la raíz del repositorio:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\experimental\studio\tools\windows\Cari-Setup.ps1

O doble clic:

    .\experimental\studio\tools\windows\Cari-Setup.bat

El script hace, en orden:

1. auditoría inicial del PC;
2. instala Git, Node.js 22, CMake, Visual Studio Build Tools + C++ y FFmpeg mediante WinGet;
3. refresca PATH y busca binarios instalados si el alias todavía no aparece;
4. ejecuta `npm install/ci`, `npm run check` y `npm test`;
5. ejecuta `validate-windows.ps1` para CMake/build/CTest;
6. hace una auditoría final;
7. guarda informe y logs en `experimental/studio/validation-evidence/`.

## Diagnóstico sin instalar

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\experimental\studio\tools\windows\Cari-Setup.ps1 -CheckOnly

## Modos útiles

    -SkipNpm
    -SkipBuild
    -NoElevation

## Qué comprueba del PC

La auditoría registra Windows/build/arquitectura, CPU, RAM, GPU/driver, D3D11, toolchain, Visual Studio C++, FFmpeg/ffprobe, ejecutable Cari, Electron/node_modules, encoders H.264/AAC, cámara, dispositivos de audio, OBS opcional y rutas de modelos locales.

El resultado se guarda como:

    experimental\studio\validation-evidence\pc-audit\pc-compatibility.json
    experimental\studio\validation-evidence\pc-audit\pc-compatibility.txt

Estados:

- `READY`: inventario sin fallos detectados;
- `READY_WITH_WARNINGS`: puede faltar algo opcional o hay una recomendación;
- `NOT_READY`: falta una capacidad/dependencia necesaria para el estado actual.

Esto es una auditoría de compatibilidad, no un benchmark. Una máquina puede quedar `READY` y todavía necesitar una prueba sostenida de captura/VTuber/streaming.

## Dependencias instaladas automáticamente

- `Git.Git`
- `OpenJS.NodeJS.22`
- `Kitware.CMake`
- `Microsoft.VisualStudio.BuildTools` + workload `Microsoft.VisualStudio.Workload.VCTools`
- `Gyan.FFmpeg`

Node.js 22 se mantiene para alinear el entorno con el CI del shell. Visual Studio Build Tools aporta el toolchain C++ necesario para compilar el runtime nativo.

OBS no se instala porque sigue siendo opcional.

Los modelos MediaPipe/avatar no se descargan automáticamente. Se auditan las variables `CARI_MEDIAPIPE_MODEL_PATH` y `CARI_AVATAR_MODEL_PATH`.

## Importante

La rama todavía no es un instalador final de usuario. Es una ruta de desarrollo reproducible para preparar una máquina Windows y obtener evidencia objetiva de compatibilidad antes de seguir adaptando el runtime.

La redistribución de FFmpeg dentro del instalador final sigue separada de su instalación local por las implicaciones de licencia y distribución.
