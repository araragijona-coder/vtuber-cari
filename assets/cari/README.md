# Cari assets

Este directorio está reservado para los recursos visuales definitivos de Cari.

## Convención de poses

Usar nombres estables para que el renderer pueda cambiar de backend sin tocar el cerebro:

- `idle.png`
- `happy.png`
- `sad.png`
- `angry.png`
- `surprised.png`
- `shy.png`
- `affectionate.png`
- `playful.png`
- `speaking.png`

Las poses son recursos visuales; la lógica decide `emotion`, `intensity`, `animation` y `speaking` mediante `AvatarCommand`.

No se agregan imágenes generadas de terceros sin revisar licencia. El fallback actual no depende de estos archivos.
