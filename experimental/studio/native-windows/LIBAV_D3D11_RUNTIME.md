# Cari Studio — Libav D3D11 runtime experimental

## Propósito

Este backend es la ruta experimental de menor copia para:

```
Windows Graphics Capture
        ↓
D3D11Compositor
        ↓
pool de AVHWFramesContext
        ↓
encoder H.264 D3D11
        ↓
libavformat
        ↓
archivo / RTMP
```

El camino raw FFmpeg CLI continúa siendo el backend por defecto.

## Activación de build

Configurar el proyecto Windows con:

```text
-DCARI_ENABLE_LIBAV_OUTPUT=ON
-DCARI_FFMPEG_ROOT=C:\ruta\a\ffmpeg-dev
```

`CARI_FFMPEG_ROOT` debe contener al menos:

```text
include/
lib/
```

y las bibliotecas requeridas por CMake.

## Activación runtime

Definir:

```text
CARI_OUTPUT_BACKEND=libav-d3d11
```

Con cualquier otro valor, Cari mantiene `raw-ffmpeg`.

La ruta Libav D3D11 se limita actualmente a fuentes de vídeo nativas que producen una textura D3D11 (ventana/pantalla). La cámara Media Foundation mantiene su ruta CPU y no se mezcla con este backend experimental.

## Encoder

El backend busca, en este orden:

```text
h264_nvenc
h264_amf
```

pero únicamente acepta un encoder que exponga `AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX` para `AV_HWDEVICE_TYPE_D3D11VA` y `AV_PIX_FMT_D3D11`.

No se selecciona un encoder hardware por nombre si el build de FFmpeg no demuestra esa capacidad.

## Propiedad de frames

No se entrega directamente al encoder la textura reusable del compositor.

Se usa:

```text
av_hwframe_get_buffer()
        ↓
textura perteneciente al pool FFmpeg
        ↓
ID3D11DeviceContext::CopyResource()
        ↓
AVFrame AV_PIX_FMT_D3D11
```

Esto evita que el encoder mantenga una referencia al mismo recurso que el compositor reutiliza para el siguiente frame.

## PTS

El PTS de Cari usa ticks de 100 ns como dominio fuente. Antes de entrar al encoder se normaliza contra el origen de la sesión y se convierte al `time_base` del encoder.

La salida Libav mantiene PTS explícitos en los AVFrame y registra PTS de entrada y paquetes escritos.

## Estado de validación

- CODE_EXISTS: sí.
- UNIT/SMOKE PREPARED: sí.
- CI_VERIFIED: no.
- WINDOWS_VERIFIED: no.
- HARDWARE_VALIDATED: no.
- PRODUCTION_VALIDATED: no.

La primera validación Windows debe comprobar al menos encoder disponible, creación del D3D11 hardware-frame pool, copia GPU→GPU, recepción de paquetes timestamped, archivo final y estabilidad sostenida.
