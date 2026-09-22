# Scavenged Audio

Generadores de audio sintético autocontenidos.

Reglas:
- sin dependencias externas para efectos Web Audio simples;
- no tocar el estado global de la aplicación;
- exponer una API pequeña;
- la inicialización debe respetar las restricciones de autoplay del navegador;
- fallos de audio no deben romper la UI.
