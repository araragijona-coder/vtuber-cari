# Cari Studio — Windows desktop

Cari Studio es un estudio local Windows-first para captura, streaming y VTubing. La aplicación no necesita una API de IA para operar.

## Instalación / lanzamiento

1. En el release de Windows se usa el instalador NSIS generado como Cari-Studio-Setup-<version>.exe.
2. El instalador crea accesos de Inicio y Escritorio.
3. Para desarrollo desde el repositorio, entrar en experimental/studio/electron-shell.
4. Ejecutar scripts\package.cmd para construir el motor nativo, instalar Node y generar el instalador.
5. Ejecutar scripts\launch.cmd para abrir el shell durante desarrollo.

El paquete Electron incluye cari-studio-native.exe dentro de resources/native.

## Twitch: conexión real

Twitch usa OAuth 2.0. Cari no puede entrar a una cuenta sin autorización del usuario. El flujo de escritorio actual solicita los permisos de chat y conserva el token cifrado mediante el almacenamiento seguro del sistema operativo.

En Twitch Developer Console:

1. Crear una aplicación nueva.
2. Registrar exactamente este Redirect URL: http://127.0.0.1:37845/oauth/callback
3. Copiar el Client ID.
4. Abrir Cari Studio.
5. En Twitch, pegar Client ID y el login del canal.
6. Pulsar Connect Twitch.
7. Autorizar user:read:chat y user:write:chat.

Después del login, Cari abre EventSub WebSocket y crea la suscripción channel.chat.message usando el session_id recibido en session_welcome. Twitch exige esa secuencia para las suscripciones por WebSocket. Las credenciales OAuth deben mantenerse privadas. (Twitch Developers: Authentication, EventSub WebSocket, Chat.)

## Cómo activar el chat

Una vez conectado Twitch:

- Los mensajes aparecen automáticamente en el panel Chat.
- Send Chat publica mensajes desde el usuario autenticado.
- Read Chat: On usa speechSynthesis local del renderer; no requiere un servicio TTS remoto.
- Enter también envía el mensaje.
- !happy, !angry y !neutral son reglas locales deterministas para cambiar la expresión.

## Avatar

El visor ya no está limitado a una cabeza. La cámara del renderer fue corregida para encuadrar el cuerpo completo.

Hay dos modos:

- Built-in full-body demo rig: cuerpo completo generado por el renderer para probar tracking y expresiones.
- Load GLB / glTF Model: abre el selector de archivos de Windows para cargar el modelo VTuber real del usuario.

El proyecto no incluye un modelo comercial ni una identidad artística inventada como si fuera la versión definitiva de Cari. El renderer soporta un modelo local y el contrato de actuación permanece separado de su apariencia.

## Captura y salida

Capture permite seleccionar ventana o pantalla primaria. El runtime nativo usa Windows Graphics Capture y WASAPI.

Outputs:

- Record Local MKV.
- Start Direct RTMP con rtmp:// o rtmps://.
- OBS queda como integración opcional mediante obs-websocket-js.

FFmpeg debe estar disponible como ffmpeg.exe o configurarse con CARI_FFMPEG_EXECUTABLE.

## Qué está realmente terminado

Implementado:
- motor nativo Windows;
- captura de ventana y pantalla;
- audio micrófono + sistema;
- mixer temporal;
- efecto de voz local;
- FFmpeg boundary;
- Twitch OAuth + EventSub chat;
- chat visible y envío;
- avatar Three.js + carga GLB/glTF;
- tracking MediaPipe;
- launcher e instalador NSIS x64 configurados;
- bitácora de continuidad.

Aún requiere validación real:
- build/installer Windows ejecutado con éxito en Actions;
- Twitch en un canal real;
- FFmpeg con named pipes durante una sesión prolongada;
- RTMP sostenido;
- composición definitiva avatar -> frame codificado;
- cámara Media Foundation;
- Game Capture;
- drift correction;
- lip-sync de producción;
- modelo artístico final;
- prueba completa en el PC objetivo.

## Fuentes oficiales de referencia

- Twitch Authentication: https://dev.twitch.tv/docs/authentication/
- Twitch WebSocket EventSub: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/
- Twitch Chat authentication: https://dev.twitch.tv/docs/chat/authenticating/
- Twitch chat subscription type: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/
- Electron Builder Windows/NSIS: https://www.electron.build/docs/win/
- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html