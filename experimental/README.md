# Experimental zone

This directory is intentionally isolated from Cari's production path.

## Rule

Anything that is not yet proven safe, useful, compatible with the project's lightweight Windows target, or properly licensed belongs here first.

Lifecycle:

`CANDIDATE → TESTING → READY_TO_MERGE → main`

or

`CANDIDATE → REJECTED/ARCHIVED`

Experimental code must not become a runtime dependency until it has tests, a license/dependency review, and an explicit merge decision.

## Current candidates

- `research/open-source-patterns.md` — patterns observed in open-source AI VTuber projects. Research only; no third-party code is copied into production.

## Production rule

GitHub `main` remains the source of truth. A feature is not finished until it is integrated into `main` and the relevant CI/build checks are green.
