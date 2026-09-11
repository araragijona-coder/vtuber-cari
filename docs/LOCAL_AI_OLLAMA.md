# IA local sin API: Ollama

Cari puede funcionar sin una API de OpenAI/Gemini.

## Modos

`CARI_LLM_MODE=local` (predeterminado)

- Solo reglas locales.
- No hace ninguna llamada de red para responder.
- Es el modo más liviano y seguro.

`CARI_LLM_MODE=ollama`

- Usa Ollama en `http://127.0.0.1:11434/api/chat`.
- No necesita API key.
- El modelo se ejecuta localmente.
- Si Ollama no está instalado/ejecutándose, Cari captura el fallo y degrada la respuesta sin cerrar el programa.

`CARI_LLM_MODE=api`

- Usa el proveedor OpenAI-compatible configurado por `CARI_LLM_*`.

`CARI_LLM_MODE=auto`

- Usa Ollama si `CARI_OLLAMA_MODEL` está definido.
- Si no, usa el proveedor API configurado.
- Si ninguno está configurado, permanece en reglas locales.

## Modelo pequeño recomendado para probar

El código acepta cualquier nombre válido de Ollama. Por ejemplo:

```text
CARI_LLM_MODE=ollama
CARI_OLLAMA_MODEL=qwen3:0.6b
```

También se puede usar otro modelo pequeño sin cambiar el programa:

```text
CARI_OLLAMA_MODEL=qwen3:1.7b
```

Si por "Ollama 3 1B" se refiere a **Llama 3.2 1B**, el nombre de Ollama es:

```text
CARI_OLLAMA_MODEL=llama3.2:1b
```

La biblioteca oficial de Ollama ofrece Llama 3.2 en 1B y 3B; la variante `llama3.2:1b` aparece con unos 1.3 GB, y existen variantes cuantizadas más pequeñas. Para Cari, el 1B es una candidata razonable para probar conversación local, pero su calidad/latencia deben medirse en el PC real en lugar de asumirlas. citeturn0search0turn0search2

No se debe instalar un modelo dentro del repositorio. Ollama administra los modelos en su propia instalación.

## Windows

1. Instalar Ollama.
2. Descargar el modelo elegido, por ejemplo `ollama run qwen3:0.6b` o `ollama run llama3.2:1b`.
3. Configurar `CARI_LLM_MODE=ollama` antes de iniciar Cari.
4. Abrir `Cari.exe`.

La instalación de Ollama y los modelos son opcionales: el ejecutable de Cari sigue siendo portable sin ellos.

## Prueba experimental

Antes de integrar cambios relacionados con Ollama, se puede comprobar el entorno sin tocar el runtime principal:

```powershell
.\experimental\ollama\smoke.ps1
```

El script comprueba que Ollama esté instalado, que `127.0.0.1:11434` responda, que el modelo exista y que una inferencia local devuelva contenido.

Para comparar modelos pequeños en el mismo PC:

```powershell
.\experimental\ollama\benchmark.ps1
```

Por defecto compara `llama3.2:1b` y `qwen3:0.6b`, omitiendo los modelos que no estén instalados. El resultado mide el tiempo total de una petición sencilla y muestra la respuesta; no modifica Cari ni instala nada.

## ¿Existe un truco para usar una API sin API key?

No hay una "puerta trasera" legítima que convierta un servicio cloud que exige autenticación en uno sin autenticación. La solución real es cambiar el punto de inferencia: ejecutar un modelo localmente. Ollama expone ese modelo mediante HTTP en localhost, por lo que Cari puede usar el mismo patrón de cliente sin enviar el texto a un proveedor externo. La API local de Ollama está documentada como una interfaz HTTP en `localhost:11434`. citeturn0search0turn0search7

Los proyectos open source de VTuber ya utilizan este enfoque: backend LLM intercambiable, inferencia local y componentes desacoplados. Cari adopta el patrón sin copiar código de terceros.

## Regla de arquitectura

Las reglas locales siempre se ejecutan primero. El modelo local solo entra cuando no existe una respuesta de regla.

Por tanto:

```text
mensaje
  ↓
Filtro
  ↓
Reglas locales ──→ respuesta sin IA externa
  ↓ si no hay regla
Ollama local ────→ respuesta sin API cloud
  ↓ si está configurado otro modo
API compatible ──→ proveedor externo
```

El contrato de salida sigue siendo `AIResponse`, por lo que voz, animación, memoria y avatar no necesitan saber qué modelo produjo la respuesta.
