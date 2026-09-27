# Rocket Bunny Petty — Experimental Zone

This directory contains Rocket Bunny Petty material that is still being evaluated.

Experimental work is intentionally isolated from the production runtime. A file or prototype may be useful for research without being safe, complete, compatible, or ready to become part of `main`.

## Lifecycle

New work follows:

```text
CANDIDATE
   ↓
TESTING
   ↓
READY_TO_MERGE
   ↓
main
```

Work that does not meet the project's requirements follows:

```text
CANDIDATE
   ↓
REJECTED / ARCHIVED
```

## Rules

Experimental material must not become a production runtime dependency merely because it exists in this directory.

Before promotion to `main`, evaluate the relevant:

- runtime compatibility;
- tests and failure boundaries;
- dependency footprint;
- licensing;
- browser/Telegram compatibility;
- performance and resource use;
- interaction with existing Rocket runtime contracts.

A successful experiment should be promoted deliberately and documented as part of the corresponding Rocket feature. A failed, obsolete, or superseded experiment should remain clearly identified as rejected or archived rather than being mistaken for production code.

## Current experimental areas

The current tree includes areas such as:

- `admin-panel/` — experimental browser administration surface.
- `diagnostics/` — diagnostic and installation-related material.
- `research/` — research notes and external project pattern analysis.

These areas are not automatically part of the production runtime.

## Source of truth

GitHub `main` is the production source of truth for Rocket Bunny Petty.

A feature is not considered integrated merely because a prototype exists under `experimental/`. It becomes part of the production project only after deliberate integration, validation, and the required repository checks.

## Cari Studio

Cari Studio is a separate project and is not the production target of this directory.

Its historical Studio material is preserved on the `cari-studio` branch. The Rocket `main` branch should not use this directory as a back door for reintroducing Cari Studio runtime components.
