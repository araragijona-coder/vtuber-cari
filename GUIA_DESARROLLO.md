# Rocket Bunny Petty — Guía de Desarrollo y Arquitectura

> **Estado:** Restricción técnica obligatoria  
> **Alcance:** Cliente del juego, integración como Telegram Mini App y backend de servicios  
> **Objetivo:** Mantener el proyecto viable en una PC modesta, con bajo consumo de recursos y una ruta clara hacia distribución como Telegram Mini App.

Esta guía establece las decisiones tecnológicas que deben respetarse durante el desarrollo de **Rocket Bunny Petty**. Su propósito es evitar cambios de stack que aumenten innecesariamente el consumo de CPU/RAM, el tamaño de los assets o la complejidad de despliegue.

La guía complementa el documento de lore y diseño y la especificación de balance/economía:

- `LORE_Y_DISENO.md`
- Issue #13 — diseño táctico, RNG y economía
- `simulation/economy_sim.js`

**Regla de arquitectura:** la implementación del juego debe mantenerse separada del runtime de VTuber y de otras aplicaciones del repositorio. Este documento define específicamente la arquitectura de Rocket Bunny Petty.

---

## 1. Motor Gráfico — Godot 4 (2D)

### 1.1 Motor obligatorio

El motor oficial del proyecto es:

- **Godot 4**
- **Renderizado 2D**
- **GDScript** como lenguaje principal

### 1.2 Motores prohibidos

Queda expresamente prohibido trasladar el proyecto principal a:

- Unity
- Unreal Engine

La prohibición existe para mantener un stack pequeño, fácil de mantener y apropiado para una PC modesta.

### 1.3 Arquitectura del cliente

La estructura recomendada del cliente Godot es:

```text
game/
├── project.godot
├── scenes/
│   ├── boot/
│   ├── main/
│   ├── battle/
│   ├── garage/
│   └── academy/
├── scripts/
│   ├── core/
│   ├── battle/
│   ├── economy/
│   ├── progression/
│   ├── telegram/
│   └── ui/
├── data/
│   ├── cards/
│   ├── characters/
│   ├── enemies/
│   └── balance/
└── assets/
    ├── sprites/
    ├── backgrounds/
    ├── ui/
    └── audio/
```

La estructura es una guía de separación de responsabilidades, no una obligación de conservar exactamente esos nombres de carpetas.

### 1.4 Principios para una PC modesta

El cliente debe priorizar:

- escenas 2D simples;
- reutilización de sprites y recursos;
- pocas instancias simultáneas de objetos;
- animaciones ligeras;
- efectos visuales controlados;
- cargas de recursos bajo demanda cuando sea conveniente;
- evitar simulaciones físicas innecesarias;
- evitar procesos en segundo plano que no aporten al gameplay.

La lógica de combate, cartas, economía y progresión debe ejecutarse de forma determinista siempre que sea posible y mantenerse independiente de la presentación visual.

### 1.5 Exportación para Telegram

El cliente deberá tener una ruta de exportación web compatible con el entorno de **Telegram Mini Apps**, utilizando la exportación web de Godot y las tecnologías web asociadas (HTML5/WebAssembly/WebGL según la configuración del proyecto y del navegador).

Objetivos:

1. cargar el juego desde el entorno web de Telegram;
2. mantener tiempos de carga razonables;
3. minimizar el tamaño total del paquete;
4. evitar dependencias nativas que impidan la ejecución en navegador;
5. separar claramente la capa de integración Telegram de la lógica principal del juego.

**Regla:** el juego debe poder ejecutarse primero como proyecto Godot independiente y después incorporar Telegram como plataforma de distribución, no al revés.

---

# 2. Estrategia MVP en 3 Fases

El desarrollo inicial debe realizarse en tres fases cerradas. No se debe añadir la siguiente capa de infraestructura antes de que la anterior sea funcional.

---

## Fase 1 — Prototipo visual y mecánico base en Godot

### Objetivo

Construir una versión jugable local que demuestre el núcleo de Rocket Bunny Petty sin depender de servidores ni de Telegram.

### Alcance mínimo

Debe incluir:

- pantalla principal;
- una escena de gameplay;
- movimiento básico;
- sistema de cartas tácticas inicial;
- combate contra enemigos;
- consumo de recursos básicos;
- resultado de victoria/derrota;
- una versión inicial del garaje;
- datos de prueba para corredoras/waifus;
- sistema básico de afinidad;
- HUD funcional.

### Reglas

Durante esta fase:

- no depender de backend para ejecutar una partida;
- no introducir gacha real;
- no introducir autenticación;
- no requerir conexión permanente;
- utilizar datos locales/mock;
- priorizar la jugabilidad sobre el contenido final.

### Criterio de salida

La Fase 1 termina cuando un usuario puede abrir el proyecto, iniciar una partida, jugar un escenario, ganar/perder y regresar al flujo principal sin intervención manual del desarrollador.

---

## Fase 2 — Integración del SDK web de Telegram

### Objetivo

Convertir el prototipo local en una experiencia ejecutable como **Telegram Mini App**.

### Componentes

La integración debe encapsularse en una capa específica:

```text
Telegram Mini App
        ↓
Telegram Web SDK / Web APIs
        ↓
Bridge de integración
        ↓
Godot
        ↓
Game Core
```

### Responsabilidades del bridge

El bridge debe encargarse únicamente de comunicación con Telegram, por ejemplo:

- inicialización del entorno;
- identificación de la sesión;
- información disponible del usuario;
- eventos de apertura/cierre;
- navegación compatible con el entorno Mini App;
- comunicación mínima entre JavaScript y Godot.

### Regla de aislamiento

La lógica de juego no debe depender directamente de funciones específicas de Telegram.

Ejemplo conceptual:

```text
GameLogic
   ↑
Game Services
   ↑
Telegram Bridge
   ↑
Telegram Web SDK
```

Esto permite continuar ejecutando el mismo núcleo de juego localmente para pruebas.

### Criterio de salida

La Fase 2 termina cuando el prototipo puede cargarse dentro de Telegram como Mini App, iniciar el juego y mantener el flujo de usuario básico sin exigir una arquitectura de servidor compleja.

---

## Fase 3 — Backend, gacha y economía

### Objetivo

Introducir persistencia y sistemas que necesiten autoridad del servidor.

Esta fase incorpora:

- cuenta/sesión de jugador;
- inventario;
- progresión persistente;
- economía;
- gacha;
- recompensas;
- validación de transacciones;
- persistencia de progreso.

### Principio importante

El cliente Godot **no debe ser la autoridad final** sobre recursos económicos.

El cliente puede solicitar:

```text
"Quiero abrir el gacha"
```

El backend decide y registra:

```text
resultado + consumo + recompensa + estado persistente
```

Esto evita que el juego dependa de datos manipulables en el navegador.

---

# 3. Backend Ultra Ligero — Python + SQLite

## 3.1 Stack obligatorio

El backend inicial debe utilizar:

- **Python**
- **FastAPI o Flask**
- **SQLite**
- **SQLite en modo WAL (Write-Ahead Logging)**

La implementación concreta puede elegir **FastAPI** o **Flask**, pero no se deben introducir frameworks pesados innecesarios.

### Arquitectura

```text
Telegram Mini App
        │
        ▼
   HTTP/HTTPS API
        │
        ▼
 FastAPI / Flask
        │
        ▼
     SQLite
       (WAL)
```

### 3.2 Razón del diseño

Rocket Bunny Petty debe poder funcionar con una infraestructura pequeña durante el MVP.

SQLite permite mantener:

- pocos procesos;
- bajo consumo de RAM;
- despliegue sencillo;
- backups fáciles;
- ausencia de un servidor de base de datos separado.

El modo WAL se utilizará para mejorar la convivencia entre lecturas y escrituras en escenarios de uso concurrente moderado.

### 3.3 Separación de módulos

Una estructura inicial razonable:

```text
backend/
├── app.py
├── config.py
├── db/
│   ├── database.py
│   ├── schema.sql
│   └── migrations/
├── api/
│   ├── auth.py
│   ├── player.py
│   ├── gacha.py
│   ├── economy.py
│   └── inventory.py
├── services/
│   ├── progression.py
│   ├── reward_service.py
│   └── gacha_service.py
└── tests/
```

La estructura puede adaptarse según evolucione el código, pero las responsabilidades deben permanecer separadas.

### 3.4 Reglas de rendimiento

El backend debe:

- evitar procesos residentes innecesarios;
- reutilizar conexiones de forma adecuada;
- evitar consultas repetitivas;
- utilizar índices sólo cuando sean necesarios;
- mantener respuestas pequeñas;
- enviar únicamente los datos que el cliente necesita;
- evitar polling agresivo desde el juego;
- registrar operaciones importantes de economía.

### 3.5 Autoridad del servidor

Deben quedar del lado del backend:

- saldo de moneda;
- inventario persistente;
- resultados oficiales del gacha;
- recompensas;
- costes de acciones económicas;
- cooldowns relevantes;
- progreso que deba protegerse contra manipulación del cliente.

La simulación local de economía seguirá siendo válida para balance y auditoría, pero no sustituye la autoridad del backend en producción.

### 3.6 Relación con la simulación

El archivo:

```text
simulation/economy_sim.js
```

continúa siendo una herramienta de auditoría del diseño.

La simulación debe utilizarse para comprobar matemáticamente:

- regla del -30%;
- economía de recursos;
- combustible;
- reservas;
- Mercado de Desguace;
- frecuencia de resultados;
- escenarios F2P/Paid;
- comportamiento de RNG.

La economía implementada en backend debe poder contrastarse con esos parámetros de diseño.

---

# 4. Optimización de Recursos

La optimización de assets es obligatoria porque el proyecto debe ser viable tanto en PC modesta como en navegador/Telegram.

## 4.1 Imágenes y sprites

### Formatos permitidos

El formato objetivo para imágenes y sprites es:

- **WebP**

Debe utilizarse como estándar principal para:

- fondos;
- sprites;
- ilustraciones;
- UI;
- imágenes de personajes;
- recursos decorativos.

### Objetivo

Reducir:

- tamaño del paquete;
- transferencia de red;
- uso de almacenamiento;
- tiempo de carga.

Cuando un recurso necesite transparencia, animación o una característica que haga incompatible el flujo estándar de WebP, la excepción deberá documentarse antes de incorporarse.

## 4.2 Audio

Los formatos objetivo son:

- **OGG**
- **MP3**

Se utilizarán para:

- música;
- efectos;
- voces;
- sonidos de interfaz.

### Reglas de audio

Debe evitarse almacenar audio sin compresión en el paquete final salvo necesidad técnica justificada.

El contenido debe organizarse por demanda cuando sea posible para no cargar simultáneamente todo el banco de audio.

---

# 5. Restricciones Técnicas Obligatorias

Las siguientes reglas forman parte de la especificación del proyecto:

| Área | Regla |
|---|---|
| Motor | Godot 4 |
| Render | 2D |
| Lenguaje principal | GDScript |
| Motores prohibidos | Unity y Unreal |
| Plataforma web | Exportación web para Telegram Mini App |
| Backend | Python |
| Framework | FastAPI o Flask |
| Base de datos | SQLite |
| SQLite | Modo WAL |
| Imágenes | WebP como formato objetivo |
| Audio | OGG/MP3 |
| Cliente | No debe ser autoridad final de economía |
| Desarrollo | MVP dividido en 3 fases |
| Runtime | Mantener bajo consumo de recursos |
| Arquitectura | Separar juego, integración Telegram y backend |

---

# 6. Principios de Arquitectura

## 6.1 Separación de responsabilidades

Rocket Bunny Petty debe dividirse en tres capas:

```text
┌──────────────────────────────┐
│       TELEGRAM / WEB         │
│ SDK + Mini App + Web Bridge  │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│        GODOT 4 / 2D          │
│ UI + Gameplay + Client Core  │
└──────────────┬───────────────┘
               │
        HTTPS / API
               │
┌──────────────▼───────────────┐
│        PYTHON BACKEND        │
│ Economía + Gacha + Persist.  │
└──────────────┬───────────────┘
               │
        SQLite (WAL)
```

## 6.2 Diseñar para degradación elegante

La ausencia temporal del backend no debe destruir la aplicación.

El diseño debe distinguir:

- funciones locales;
- funciones que requieren servidor;
- estado cacheable;
- operaciones que requieren validación remota.

La partida y la interfaz no deben bloquearse innecesariamente por llamadas de red que no sean esenciales.

## 6.3 El rendimiento es una característica del diseño

La optimización no se deja para el final.

Cada nuevo sistema debe evaluarse según:

- CPU;
- RAM;
- tamaño de assets;
- tiempo de carga;
- cantidad de draw calls cuando sea relevante;
- tráfico de red;
- frecuencia de acceso al backend.

---

# 7. Política de Evolución Tecnológica

La tecnología puede cambiar sólo cuando exista una razón técnica documentada.

No se debe introducir una dependencia nueva únicamente porque:

- sea popular;
- simplifique una tarea trivial;
- añada efectos visuales innecesarios;
- requiera un servidor adicional;
- aumente significativamente el consumo de recursos.

Cualquier cambio de stack debe demostrar que conserva:

1. compatibilidad con PC modesta;
2. compatibilidad con Telegram Mini App;
3. mantenibilidad;
4. bajo consumo;
5. separación entre gameplay y servicios externos.

---

# 8. Criterio de Éxito del MVP

El MVP técnico se considera viable cuando:

1. **Godot 4** ejecuta el juego 2D localmente con recursos modestos.
2. El mismo cliente puede exportarse a web para su uso como **Telegram Mini App**.
3. La integración de Telegram está aislada mediante un bridge.
4. El backend funciona con **Python + FastAPI/Flask + SQLite WAL**.
5. Gacha y economía persistente pueden validarse desde el servidor.
6. Los assets principales respetan **WebP + OGG/MP3**.
7. Las simulaciones de `simulation/economy_sim.js` pueden contrastarse con los parámetros económicos del juego.
8. Ninguna decisión de arquitectura obliga a utilizar Unity, Unreal o infraestructura pesada.

---

## 9. Regla Final

> **Rocket Bunny Petty debe construirse primero como un juego 2D ligero, después como una Mini App de Telegram y finalmente como un servicio persistente con backend.**

El orden de prioridad es:

```text
Jugabilidad
   ↓
Rendimiento
   ↓
Compatibilidad Web/Telegram
   ↓
Persistencia y economía
   ↓
Escalabilidad futura
```

La escalabilidad futura nunca debe justificar sacrificar la viabilidad del MVP actual.

