# MACH-GIRLS — PROBLEMAS DE HUESOS

## PROPÓSITO
Registro estructural de salud del juego.
Aquí se guardan problemas, riesgos, contradicciones y deudas arquitectónicas que puedan causar roturas futuras, desincronización, fugas de memoria, acoplamiento, pérdida de progreso, conflictos entre sistemas o regresiones al escalar.

Objetivo actual: SANAR EL CUERPO ANTES DE SEGUIR AGREGANDO CONTENIDO.

## REGLA PRINCIPAL
Una entrada no se considera resuelta porque el código parezca correcto o porque una IA diga que está bien.
Se considera sana cuando existe evidencia verificable y pasa a GREEN / VERIFIED.

## ESTADOS
RED = problema activo o frontera peligrosa que debe resolverse antes de depender de ella.
AMBER = riesgo real o deuda estructural que requiere auditoría, diseño o hardening.
GREEN = auditado y respaldado por evidencia suficiente para continuar.
UNKNOWN = evidencia insuficiente.
OUTSIDE-SCOPE = registrado, pero no es un defecto actual que bloquee el trabajo presente.

## REGLA ANTI-FALSA-ALARMA
Una hipótesis externa no se convierte automáticamente en bug.
Flujo: HIPÓTESIS → INSPECCIÓN → EVIDENCIA → CLASIFICACIÓN.

Ejemplo: el RNG del combate ya usa un generador con semilla. Por ello la falta de seeded RNG está GREEN / VERIFIED y no debe implementarse de nuevo.
Los módulos actuales también están encapsulados con IIFE. El riesgo distinto y todavía relevante es la superficie pública expuesta mediante window.*.

## BONE HEALTH GATE
Mientras existan entradas RED, las nuevas mecánicas importantes quedan bloqueadas salvo que la tarea sea reparar huesos.
Mientras existan AMBER, el Cerebro debe verificar que el siguiente trabajo no aumente el riesgo de esa frontera.

Objetivo: RED → AMBER → GREEN → VERIFIED.

## PRINCIPIO
Primero huesos sanos. Después músculo, contenido y velocidad.