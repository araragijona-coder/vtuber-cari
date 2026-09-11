# VTuber Cari — Foundation

Dependency-light, local-first foundation for a modular AI VTuber.

This repository is the GitHub snapshot of the Cari VTuber foundation through Pass 21.

## Architecture

```text
Twitch / events
  -> EventBus
  -> chat intelligence
  -> intent candidates
  -> IntentAdmissionPolicy
  -> IntentArbiter
  -> local rule / future local model / future provider
  -> voice / avatar / scene
```

## Pass 21

Adds state-aware intent admission so Cari does not start competing actions while speaking, thinking, sleeping, or transitioning. High-priority alerts can still interrupt when permitted.

## Validation

```bash
python -m unittest discover -s tests -q
python -m compileall -q app tests
```

The complete Pass 21 snapshot, including all source, tests, docs and profiles, is preserved as the local release ZIP used for this GitHub import.
