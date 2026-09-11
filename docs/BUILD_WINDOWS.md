# Cari — paquete Windows

## Objetivo

El proyecto puede producir un paquete portátil de Windows con `Cari.exe`. El ejecutable abre la interfaz de Cari sin pedir una consola de Python al usuario.

## Qué contiene el paquete

```text
Cari-Windows-Portable/
├── Cari.exe
├── Abrir-Cari.bat
├── LEEME.txt
├── BUILD_WINDOWS.md
├── data/
└── assets/
    └── cari/
```

Se puede iniciar haciendo doble clic en `Cari.exe` o `Abrir-Cari.bat`.

## Cómo se genera

GitHub Actions ejecuta `.github/workflows/build-windows.yml` en un runner Windows, instala PyInstaller y empaqueta `main.py` como aplicación gráfica de un solo ejecutable. Después genera `Cari-Windows-Portable.zip` como artefacto.

## Estado actual de los recursos

El núcleo ya tiene un renderer Tk animado y render-neutral, por lo que el ejecutable funciona incluso sin recursos externos. La sustitución por arte PNG/Live2D se mantiene desacoplada del cerebro y del pipeline.

Los siguientes recursos son deliberadamente independientes del ejecutable:

- arte definitivo de Cari y sus poses;
- voz TTS anime definitiva;
- credenciales/configuración de Twitch;
- configuración OBS/captura.

No se deben incrustar credenciales en el ejecutable ni en Git.

## Criterio de cierre de distribución

Una build de Windows se considera lista cuando:

1. `Cari.exe` arranca en Windows limpio;
2. la interfaz muestra el avatar;
3. el chat local responde a las reglas disponibles;
4. el TTS configurado no rompe el proceso si falla;
5. la memoria puede guardarse;
6. el paquete se puede abrir con doble clic;
7. el artefacto de GitHub Actions se descarga y contiene exactamente el paquete esperado.

El ejecutable por sí solo no implica que Twitch, TTS o el arte final estén configurados.
