# Pass 28 — cierre de la base ejecutable

## Cambios

- Se agregó un renderer de avatar animado, sin dependencias externas, sobre Tkinter.
- La ventana de Cari ahora presenta escenario/avatar + chat en una sola interfaz.
- La animación responde al `AvatarCommand` y abre/cierra la boca durante habla.
- Se agregó un contrato de URL de autorización OAuth para TwitchIO 3.
- Se agregaron pruebas del contrato OAuth.
- El README fue actualizado con el estado real de cierre.

## Validación

CI `34572198411` terminó correctamente en Python 3.11 y 3.12 antes del último commit documental.

CI `34572237216` se lanzó para el último commit `5c285025c6f0790d02c72bb497843b52be29892d`; debe quedar en verde antes de considerar este pass validado.

## Límite honesto

La base de software puede quedar verde sin credenciales ni assets reales. El 100% operativo de stream requiere una prueba fuera de CI con:

- arte de Cari/modelo real;
- aplicación Twitch y OAuth autorizado;
- voz TTS elegida;
- captura/OBS configurado;
- una sesión real de Twitch de extremo a extremo.

No se marca ese último tramo como completado sin evidencia real.
