# BearMap – Data model (proposed)

## Storage (server)
### `reports`
- `id` (uuid)
- `species` (text) – MVP: "bear"
- `kind` (text enum) – "sighting" | "sign"
- `lat_q` (float) – quantized
- `lng_q` (float) – quantized
- `grid_m` (int) – quantization grid used (so we can change later)
- `reported_at` (timestamp)
- `note` (text, nullable)
- `photo_url` (text, nullable)
- `created_at` (timestamp)
- `expires_at` (timestamp)

Indexes
- geospatial index (depends on DB)
- `expires_at`

## API (minimal)
### POST `/reports`
Request
- `species` (optional; default bear)
- `kind`
- `lat`,`lng` (client raw; server will quantize again)
- `note?`
- `photo?` (multipart or presigned upload)

Response
- created report

### GET `/reports?bbox=...&since=...&kind=...`
- returns list suitable for map display

### GET `/reports/:id`
- returns full detail

## Quantization
Store *only* quantized coordinates.

Simple quantization (grid in meters) can be implemented by converting to Web Mercator meters (or approximate in lat/lng with cosine adjustment). The server must be the final authority.
