# Cari Studio — setup y auditoría Windows

## Uso recomendado

Desde la raíz del repositorio:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\experimental\studio\tools\windows\Cari-Setup.ps1

O doble clic en:

    .\experimental\studio\tools\windows\Cari-Setup.bat

## Qué hace

1. Audita el PC.
2. Instala con WinGet Git, Node.js 22, CMake, Visual Studio Build Tools + C++, y FFmpeg.
3. Actualiza PATH del proceso.
4. Instala dependencias Electron con npm.
5. Ejecuta npm run check y npm test.
6. Usa el validate-windows.ps1 existente para CMake/build/CTest.
7. Vuelve a auditar el PC.
8. Guarda JSON/TXT y logs en experimental/studio/validation-evidence/.

## Modos

    -CheckOnly
    -SkipNpm
    -SkipBuild
    -NoElevation

## Dependencias

- Git.Git
- OpenJS.NodeJS.22
- Kitware.CMake
- Microsoft.VisualStudio.BuildTools + Microsoft.VisualStudio.Workload.VCTools
- Gyan.FFmpeg

Node.js 22 se usa para alinear el desarrollo local con el CI del shell. Visual Studio C++ se instala mediante la carga de trabajo VCTools.

OBS no se instala porque Cari Studio no depende de OBS para captura/output nativo.

No se descargan automáticamente modelos de MediaPipe, avatares ni assets propietarios.

## Resultado

La auditoría produce:

- pc-compatibility.json
- pc-compatibility.txt

Estados:

- READY: sin fallos detectados.
- READY_WITH_WARNINGS: faltan piezas opcionales/recomendaciones.
- NOT_READY: falta una capacidad o dependencia necesaria.

La auditoría es de compatibilidad/inventario. No sustituye un benchmark sostenido de captura, VTuber y streaming en el PC objetivo.
