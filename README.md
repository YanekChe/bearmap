# BearMap (PWA)

Standalone PWA for hikers to report **bear sightings / sign** and for others to view **recent wildlife hazard** near an area or planned route.

This folder is the project scratchpad/spec for now.

## Product goals
- Fast, low-friction reporting in the field.
- Make reports **time-bounded** (wildlife moves).
- Protect wildlife + people via **privacy + location blurring**.
- Useful “near my route / near me” warnings.

## MVP (first ship)
**Report**
- Drop pin (GPS + manual adjust)
- Type: `Bear sighting` vs `Bear sign` (tracks/scat/scratches)
- Optional note + optional photo
- Auto timestamp

**View**
- Map with clustered pins
- Filters: last 24h / 7d, sighting vs sign
- Detail sheet: age, approx distance, note/photo (if provided)

**Safety + privacy defaults**
- Location is **quantized** (e.g. 300–500m grid) before storing.
- Reports auto-expire (e.g. high relevance 24h; visible 7d).
- Anonymous by default; no public user identity.

## Next features (post-MVP)
- Route-aware alerts (“X reports within Y miles of your route”) via uploaded GPX.
- Confirmations: “I saw this too” / “area seems clear now” (with throttling).
- Reputation + rate limiting.
- Offline cache + queued submit.
- Push notifications (optional).

## Tech constraints (PWA)
- Must work with spotty service.
- Must degrade gracefully without precise location permissions.

See:
- `SPEC.md` for detailed requirements
- `DATA_MODEL.md` for proposed schema
- `BACKLOG.md` for tasks
