# Rocket Bunny Petty

Rocket Bunny Petty is the Rocket Bunny game project in this repository. The `main` branch is the production-oriented home for the game's Telegram Mini App, browser runtime, game data layer, administration surface, tests, simulations, documentation, and controlled experimental work.

Cari Studio is maintained separately on the `cari-studio` branch.

## Project separation

The repository is intentionally divided as follows:

```text
main
└── Rocket Bunny Petty

cari-studio
└── Cari Studio / VTuber
```

The Cari Studio branch retains the historical VTuber application, its documentation, tests, scripts, tools, workflows, and experimental Studio material. The `main` branch should contain Rocket Bunny Petty only, apart from repository-level infrastructure that is explicitly shared.

## Current architecture

The current Rocket runtime is centered on the Telegram Mini App under:

```text
intento_2/webapp/
```

The active browser entry point is:

```text
intento_2/webapp/index.html
```

Its current client-side loading order is:

```text
index.html
  ├─ Telegram WebApp SDK
  ├─ css/style.css
  ├─ js/api.js
  ├─ js/combat.js
  ├─ js/data/*
  ├─ js/admin/*
  └─ js/app.js
```

The runtime is intentionally kept lightweight and browser-oriented. The current API layer exposes a small client boundary with mock responses, while the combat module contains the DTO validation, local state handling, rendering, and demo-turn simulation used by the current Mini App.

## Telegram Mini App

The Mini App is designed to run inside Telegram's Web App environment while remaining usable in a normal browser preview.

The entry point initializes the Telegram Web App when the Telegram SDK is available and otherwise keeps a local-preview path.

GitHub Pages deploys the contents of:

```text
intento_2/webapp/
```

The Pages workflow is:

```text
intento_2/.github/workflows/deploy-pages.yml
```

It is deliberately preserved as part of the Rocket runtime/deployment surface.

## Runtime

The current runtime is a browser client built from standard HTML, CSS, and JavaScript.

Important runtime components include:

- `index.html` — Mini App entry point and script loading order.
- `css/style.css` — presentation layer.
- `js/api.js` — client API boundary used by the current browser runtime.
- `js/combat.js` — combat DTO validation, combat state, rendering, damage application, and local turn simulation.
- `js/app.js` — Telegram initialization and browser data-storage initialization.
- `js/data/` — UUID generation, schema validation, default data, and database management.
- `js/admin/` — browser administration UI.
- `js/game.js` — retained game implementation material; it is not removed as part of the Cari separation.
- `js/scavenged/` — retained experimental/recovered browser material; it is intentionally preserved for later evaluation.

The separation work does not delete or rewrite the protected runtime files.

## Combat

The combat client currently works around explicit data contracts.

`combat.js` validates:

- `CombatInitDTO`
- `TurnResultDTO`
- attacker and target descriptors
- combat math
- post-action state

The renderer maintains player/enemy combatants, HP state, images/placeholders, turn results, and impact feedback.

A local demo can be started with **Simular Turno** when no combat initialization has been supplied. This is a browser-side demonstration path, not a claim of authoritative server combat resolution.

## Data and economy

The browser data layer is under:

```text
intento_2/webapp/js/data/
```

It currently contains:

- `uuid.js`
- `schema_validator.js`
- `default_database.js`
- `database_manager.js`

The data layer includes the structures used by the current browser administration/game data surface, including schema validation and persistent browser-side database handling.

Economic and progression experimentation is kept separate from the runtime in:

```text
simulation/economy_sim.js
```

The simulation is analysis/tooling material. It is not treated as the authoritative browser runtime.

The repository also retains the Rocket Bunny design and lore documents:

- `GUIA_DESARROLLO.md`
- `LORE_Y_DISENO.md`

These documents define the project's broader technical and world-design direction without being mistaken for runtime code.

## Admin panel

The current browser administration surface is under:

```text
intento_2/webapp/js/admin/
```

and the repository also retains the experimental standalone administration panel:

```text
experimental/admin-panel/
```

The standalone panel remains explicitly experimental and is not removed by the Cari separation.

## Tests

The Rocket repository currently retains the focused browser data contract test:

```text
tests/admin_data_v2.test.mjs
```

It can be executed with:

```bash
node --test tests/admin_data_v2.test.mjs
```

This test is also referenced by:

```text
.github/workflows/admin-domain-v2.yml
```

That workflow remains preserved. Its current trigger configuration targets the corresponding feature branch and pull requests rather than treating the workflow as a main-branch deployment gate.

Test execution should always be reported separately from structural repository validation.

## GitHub Pages

The Telegram Mini App deployment workflow is:

```text
intento_2/.github/workflows/deploy-pages.yml
```

It watches changes to the Web App and the workflow itself, uploads `intento_2/webapp` as the Pages artifact, and deploys it through GitHub Pages.

The Cari-specific asset-generation workflow and other historical Cari workflows are no longer part of `main`.

## Repository structure

The Rocket-oriented tree is organized around these areas:

```text
.
├── .github/workflows/
│   └── admin-domain-v2.yml
├── intento_2/
│   ├── .github/workflows/
│   │   └── deploy-pages.yml
│   └── webapp/
│       ├── index.html
│       ├── css/
│       └── js/
│           ├── api.js
│           ├── app.js
│           ├── combat.js
│           ├── data/
│           ├── admin/
│           └── scavenged/
├── experimental/
│   ├── admin-panel/
│   ├── diagnostics/
│   ├── research/
│   └── README.md
├── simulation/
│   └── economy_sim.js
├── tests/
│   └── admin_data_v2.test.mjs
├── GUIA_DESARROLLO.md
├── LORE_Y_DISENO.md
└── README.md
```

Historical development branches remain separate and are not deleted as part of this repository cleanup.

## Experimental work

Rocket experimental work belongs under `experimental/` until it has been evaluated.

The repository uses this lifecycle:

```text
CANDIDATE
   ↓
TESTING
   ↓
READY_TO_MERGE
   ↓
main
```

Rejected or superseded material follows:

```text
CANDIDATE
   ↓
REJECTED / ARCHIVED
```

Experimental code is not a production dependency merely because it exists in the repository. Changes must be validated, reviewed for dependencies and licensing where relevant, and integrated deliberately.

See [experimental/README.md](experimental/README.md) for the local policy.

## Development

For browser/runtime work, start from:

```text
intento_2/webapp/index.html
```

Keep gameplay/runtime changes inside the Rocket surface and preserve the separation between:

- browser presentation;
- combat logic;
- data/schema handling;
- administration;
- simulation;
- experimental material.

Before changing protected runtime files, inspect their current consumers and associated tests/workflows.

For the focused browser data test:

```bash
node --test tests/admin_data_v2.test.mjs
```

For GitHub Pages, changes to the Mini App should be checked together with:

```text
intento_2/.github/workflows/deploy-pages.yml
```

## Cari Studio separation

Cari Studio is not part of Rocket Bunny Petty's `main` runtime.

Its dedicated branch is:

```text
cari-studio
```

The Cari branch retains the Studio application and its historical documentation, tests, scripts, tools, and workflows. The separation is intentionally performed without deleting the historical branch or rewriting its contents.

No Cari Studio dependency should be reintroduced into Rocket Bunny Petty's runtime merely for convenience. If a future feature genuinely belongs to Rocket, it should be reimplemented or integrated as a Rocket-specific component with its own validation.

## Scope of this branch

The purpose of `main` is now clear:

```text
Rocket Bunny Petty
├── Telegram Mini App
├── browser combat/runtime
├── game data and administration
├── Rocket tests
├── economy simulation
├── Rocket documentation
└── controlled experimental work
```

Cari Studio remains a separate project surface on `cari-studio`.
