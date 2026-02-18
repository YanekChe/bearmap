# BearMap – Spec (v0)

## 1) Users & use-cases
- Hiker sees a bear (or sign) and wants to quickly warn others.
- Hiker planning a hike wants to check whether an area has **recent reports**.

## 2) Core objects
### Report
A single observation of either:
- **Sighting**: direct visual of bear.
- **Sign**: tracks/scat/scratches/sounds/etc.

Fields (MVP)
- `type`: sighting | sign
- `species`: bear (MVP hard-coded, later expand)
- `lat`,`lng`: **stored after privacy transform**
- `reportedAt`: timestamp (server time preferred)
- `note`: optional text
- `photo`: optional

Computed
- `age`: now - reportedAt
- `expiresAt`: per retention policy

## 3) Location privacy & safety
### Goal
Prevent people from using the app to harass wildlife or locate dens.

### Approach
- **Quantize** coordinates before storing (snap to grid).
  - Initial suggestion: 300m grid (adjustable). 
- Optionally add small random jitter within cell.
- Don’t show exact time; show “~2h ago” style in UI.

### Edge cases
- If the user is offline: store raw GPS locally, but when submitting, transform before upload.

## 4) Freshness / retention
Default policy (tunable)
- Show in main view for 7 days.
- Highlight as “recent” for first 24 hours.
- Hard delete after 30 days (optional; depends on moderation/audit needs).

## 5) Reporting UX
- Primary CTA: “Report bear”
- Map opens centered on current position.
- User can drag pin slightly.
- User chooses: Sighting vs Sign.
- Optional note/photo.
- Submit.

Validation
- Require geolocation OR manual map selection.
- Require type.

## 6) Viewing UX
- Map with clustering.
- Tap pin → report detail.
- Filters:
  - time window: 24h | 7d
  - type: sighting/sign

## 7) Abuse prevention (MVP-lite)
- Rate limit: e.g. max 3 reports / 24h / device.
- Basic flagging (optional v0.2).

## 8) Non-goals (for MVP)
- Real-time tracking.
- Exact bear positions.
- Identity / social profiles.

## 9) Open questions
- Should we support “area clear” check-ins? If so, how to avoid false reassurance?
- Will we require login at all (later) or device-based anonymous identity?
- Grid size for quantization: 200m vs 500m?
