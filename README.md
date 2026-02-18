# BearMap (PWA)

Standalone **sketch-style** PWA for hikers to report **bear sightings / sign** and for others to view **recent wildlife hazards** near an area.

This repo is intentionally simple and open-source.

## Status
- Early MVP: Leaflet map + geolocation + local-only report pins.
- Next: approximate/blurred location storage + sharing backend.

## Run locally
Requirements: Node + npm

```bash
cd app
npm install
npm run dev
```

Then open:
- http://localhost:5173

To test on your phone (same Wi‑Fi):
```bash
npm run dev -- --host 0.0.0.0 --port 5173
```
Then open the printed Network URL (e.g. `http://192.168.x.x:5173`).

## MVP behavior (current)
- App requests GPS and centers the map on you.
- **Report** lets you create a `sighting` or `sign` with an optional note.
- Pins are stored in `localStorage` (device-only).

## Safety & privacy (planned)
- Stored locations will be **quantized/blurred** before sharing.
- Reports will be **time-bounded** (wildlife moves).

See:
- `SPEC.md` – product spec
- `STYLE_GUIDE.md` – sketch aesthetic (printed text)
- `DATA_MODEL.md` – proposed schema/API
- `BACKLOG.md` – tasks

## License
MIT — see `LICENSE`.
