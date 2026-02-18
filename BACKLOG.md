# BearMap – Backlog

## MVP
- [ ] Decide stack (suggestion: Vite + React + MapLibre GL or Leaflet)
- [ ] Basic PWA shell (installable, offline cache)
- [ ] Map view w/ current location
- [ ] Report flow (pin + kind + note + optional photo)
- [ ] Reports list fetch by viewport
- [ ] Clustering
- [ ] Detail modal
- [ ] Location quantization implementation (client + server)
- [ ] Retention/expiry job
- [ ] Rate limiting (device-based)

## v0.2
- [ ] GPX upload + route proximity query
- [ ] Confirmations
- [ ] Flagging/moderation queue
- [ ] Push notifications

## Decisions needed
- [ ] Quantization grid size (300m? 500m?)
- [ ] Expiry windows
- [ ] Hosting (Cloudflare Pages + Workers? Supabase? Firebase?)
