# Cari — álbum anime y galería oficial

Este directorio es el álbum visual organizado de **Cari en modo anime**.

La regla de uso es simple: **sube las imágenes PNG a la subcarpeta que corresponda**. El catálogo inferior se actualiza automáticamente mediante GitHub Actions y muestra cada PNG encontrado como miniatura.

> Las imágenes deben ser propias o contar con autorización/licencia documentada. Esta carpeta no concede derechos sobre obras de terceros.

## Estructura

| Carpeta | Uso |
|---|---|
| [`poses/neutral/`](poses/neutral/) | Pose base, idle, postura relajada |
| [`poses/talking/`](poses/talking/) | Hablando, streaming, diálogo |
| [`poses/happy/`](poses/happy/) | Feliz, sonrisa, celebración |
| [`poses/angry/`](poses/angry/) | Enojada, molestia, frustración |
| [`poses/sad/`](poses/sad/) | Triste, preocupación, llanto |
| [`poses/surprised/`](poses/surprised/) | Sorpresa, shock, reacción |
| [`poses/shy/`](poses/shy/) | Vergüenza, timidez, sonrojo |
| [`poses/playful/`](poses/playful/) | Bromista, traviesa, energética |
| [`poses/affectionate/`](poses/affectionate/) | Afectuosa, cariñosa |
| [`expressions/eyes/`](expressions/eyes/) | Variantes de ojos/mirada |
| [`expressions/mouth/`](expressions/mouth/) | Variantes de boca |
| [`expressions/full-face/`](expressions/full-face/) | Expresiones faciales completas |
| [`designs/base/`](designs/base/) | Diseño/anime base de Cari |
| [`designs/outfits/`](designs/outfits/) | Ropa y outfits |
| [`designs/cosplay/`](designs/cosplay/) | Cosplays y versiones temáticas |
| [`scenes/stream/`](scenes/stream/) | Imágenes para stream, overlays o anuncios |
| [`scenes/promo/`](scenes/promo/) | Promoción, banners y material público |
| [`scenes/seasonal/`](scenes/seasonal/) | Navidad, Halloween, verano, eventos, etc. |

## Convención recomendada para archivos

```text
neutral_01.png
happy_01.png
happy_big-smile.png
talking_01.png
angry_01.png
schoolgirl_v1.png
cosplay_zero-two.png
summer_01.png
```

Evita espacios, tildes y caracteres especiales en los nombres de archivo.

## Cómo funciona el catálogo automático

GitHub Actions busca recursivamente todos los archivos `.png` dentro de `assets/cari-album/` y reconstruye la sección **Galería automática** usando:

- categoría;
- subcategoría;
- nombre del archivo;
- ruta directa;
- miniatura Markdown.

No tienes que editar manualmente esa sección.

<!-- CARI-ALBUM:AUTO-START -->
## Galería automática

Todavía no hay PNG registrados en este álbum.

<!-- CARI-ALBUM:AUTO-END -->

## Registro de procedencia

Para arte original o autorizado, registra la procedencia en [`assets/cari/ASSET_LICENSE.md`](../cari/ASSET_LICENSE.md) o en la documentación específica del paquete cuando corresponda.

## No mezclar con el runtime

Este álbum es una **biblioteca visual**. No debe asumirse que una imagen PNG pasa automáticamente a formar parte del avatar de producción, del renderer o de la señal de streaming.