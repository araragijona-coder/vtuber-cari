# Pass 25 — runtime closure

This pass closes the missing runtime imports in the GitHub repository and turns the foundation into a coherent executable path.

## Added

- provider-neutral Twitch chat model;
- optional TwitchIO 3 adapter;
- local chat filter;
- viewer/duplicate admission gate;
- deterministic comment ranking;
- render-neutral avatar controller;
- provider-neutral voice director;
- fail-closed atomic persistence helper;
- desktop smoke UI;
- runtime smoke tests;
- GitHub Actions CI for Python 3.11 and 3.12;
- optional persistent memory wiring in `LocalPipeline`.

## Green verification

GitHub Actions run `34568147100` completed successfully on both Python 3.11 and 3.12.

Both jobs passed:

- compileall
- unit tests

## Design rule

The core can run without TwitchIO. Twitch integration is an optional adapter, so the local-first runtime remains dependency-light. TwitchIO 3 supplies the async event and OAuth infrastructure when the Twitch extra is installed.

## Remaining product work

The foundation is green, but production completion still requires real avatar assets/rendering, real TTS backend selection, Twitch OAuth configuration, provider adapters for strong LLM fallback, and an end-to-end stream rehearsal. Those are integration/product milestones, not hidden behind fake green tests.
