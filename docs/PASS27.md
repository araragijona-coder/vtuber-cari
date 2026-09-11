# Pass 27 — Failure boundaries

## Objetivo

Cerrar un problema de producción: un fallo del proveedor LLM o del dispositivo/driver de voz no debe tumbar el proceso principal de Cari.

## Cambios

- `SafeTTS` aísla errores del backend de voz y conserva el estado de error para diagnóstico.
- `LocalPipeline` captura fallos del LLM y degrada a modo local sin excepción no controlada.
- `LocalPipelineResult` expone `llm_error` y `tts_error` sin romper el contrato existente.
- Se añadieron pruebas de fallo de proveedor y audio.

## Estado

La ruta de conversación queda preparada para degradación segura:

```text
chat
 -> filtro/gate/ranking
 -> regla local
 -> LLM opcional
      └─ falla -> no tumba Cari
 -> respuesta
 -> TTS
      └─ falla -> no tumba Cari
 -> memoria
```

Esto es especialmente importante antes de conectar Twitch y audio real: la conversación no debe depender de que un servicio externo o un driver de Windows esté sano en todo momento.
