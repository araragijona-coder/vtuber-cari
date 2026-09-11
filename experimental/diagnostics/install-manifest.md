# Instalación segura: contrato experimental

Esta carpeta contiene ideas que todavía no se integran al instalador principal.

## Objetivo

Toda instalación debe avanzar por etapas verificables y detenerse ante un error. No se debe continuar después de un estado desconocido.

## Secuencia propuesta

1. Detectar sistema operativo y arquitectura.
2. Verificar Python y versión soportada.
3. Crear o validar `.venv`.
4. Actualizar pip.
5. Instalar dependencias declaradas, sin descargar extras ocultos.
6. Compilar `app` y `tests`.
7. Ejecutar pruebas unitarias.
8. Detectar Ollama sin iniciarlo forzosamente.
9. Si Ollama está presente, comprobar endpoint y modelo seleccionado.
10. Escribir un diagnóstico legible de cada etapa.
11. Si una etapa falla: detener el proceso, guardar traceback/estado y mostrar al usuario dónde copiarlo.

## Regla de seguridad

Nunca ocultar un error de instalación o arranque. Nunca continuar silenciosamente después de un fallo.

## Estado

Experimental: pendiente de convertir en una prueba automatizada del instalador sin duplicar la lógica productiva.
