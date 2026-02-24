import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet'
import './App.css'
import { installLeafletDefaultIconFix } from './lib/leafletIconFix'
import type { BearReport, ReportKind } from './lib/types'
import { loadReports, saveReports } from './lib/storage'
import { fetchReports, getSession, insertReport, sendMagicLink, signOut } from './lib/backend'
import { hasSupabase } from './lib/supabase'

installLeafletDefaultIconFix()

function uuid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatAge(ms: number) {
  const s = Math.max(1, Math.floor(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const s1 = Math.sin(dLat / 2)
  const s2 = Math.sin(dLng / 2)
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function formatDistance(meters: number) {
  // Prefer feet for close distances (US hiking vibe), then miles.
  const feet = meters * 3.28084
  if (feet < 1000) return `~${Math.round(feet)} ft`
  const miles = feet / 5280
  if (miles < 10) return `~${miles.toFixed(1)} mi`
  return `~${Math.round(miles)} mi`
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 13), { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])
  return null
}

function BoundsWatcher({
  onChange,
}: {
  onChange: (b: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void
}) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds()
      onChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      })
    },
    zoomend: () => {
      const b = map.getBounds()
      onChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      })
    },
  })

  // Initialize once
  useEffect(() => {
    const b = map.getBounds()
    onChange({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export default function App() {
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'ok' | 'denied' | 'error'>('idle')
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [reports, setReports] = useState<BearReport[]>(() => loadReports())
  const [backendStatus, setBackendStatus] = useState<'off' | 'connecting' | 'auth' | 'on' | 'error'>
    (hasSupabase() ? 'connecting' : 'off')

  const [authOpen, setAuthOpen] = useState(false)
  const [authEmail, setAuthEmail] = useState<string>(() => localStorage.getItem('bearmap.auth.email') ?? '')
  const [authSent, setAuthSent] = useState(false)
  const [authSending, setAuthSending] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportKind, setReportKind] = useState<ReportKind>('sighting')
  const [reportNote, setReportNote] = useState('')

  // Viewer safety radius (distance from you)
  const radiusOptionsFt = [500, 1000, 1320, 2640] // 0.25mi, 0.5mi
  const [radiusFt, setRadiusFt] = useState<number>(500)

  // Show recents only after selecting a pin.
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [bounds, setBounds] = useState<{ minLat: number; maxLat: number; minLng: number; maxLng: number } | null>(
    null,
  )

  useEffect(() => {
    saveReports(reports)
  }, [reports])

  useEffect(() => {
    if (!hasSupabase()) return
    let cancelled = false

    ;(async () => {
      try {
        setBackendStatus('connecting')
        const session = await getSession()
        if (cancelled) return

        if (session) {
          setBackendStatus('on')
          return
        }

        setBackendStatus('auth')
        setAuthOpen(true)
      } catch {
        if (!cancelled) setBackendStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.createdAt - a.createdAt),
    [reports],
  )

  const selectedReport = useMemo(
    () => (selectedId ? reports.find((r) => r.id === selectedId) ?? null : null),
    [reports, selectedId],
  )

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error')
      return
    }

    setGeoStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setGeoStatus('ok')
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoStatus('denied')
        else setGeoStatus('error')
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 15_000 },
    )
  }

  useEffect(() => {
    // Ask on first load (PWA style).
    requestLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (backendStatus !== 'on') return
    if (!bounds) return

    let cancelled = false

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    ;(async () => {
      try {
        const remote = await fetchReports({
          ...bounds,
          sinceIso: since,
          limit: 200,
        })
        if (cancelled) return

        // Merge remote into local (prefer remote by id).
        setReports((prev) => {
          const byId = new Map(prev.map((r) => [r.id, r]))
          for (const r of remote) byId.set(r.id, r)
          return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt)
        })
      } catch {
        // ignore
      }
    })()

    return () => {
      cancelled = true
    }
  }, [backendStatus, bounds])

  const canReport = geoStatus === 'ok' && !!pos

  const submitAuth = async () => {
    const email = authEmail.trim()
    if (!email) return

    localStorage.setItem('bearmap.auth.email', email)

    setAuthError(null)
    setAuthSending(true)

    try {
      await sendMagicLink(email)
      setAuthSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setAuthError(msg)
      console.error('sendMagicLink failed', err)
    } finally {
      setAuthSending(false)
    }
  }

  const doSignOut = async () => {
    try {
      await signOut()
    } finally {
      setBackendStatus('auth')
      setAuthOpen(true)
      setAuthSent(false)
    }
  }

  const submitReport = async () => {
    if (!pos) return

    const localDraft: BearReport = {
      id: uuid(),
      kind: reportKind,
      note: reportNote.trim() || undefined,
      lat: pos.lat,
      lng: pos.lng,
      createdAt: Date.now(),
    }

    // Optimistic local update.
    setReports((prev) => [localDraft, ...prev])
    setSelectedId(localDraft.id)

    try {
      if (backendStatus === 'on') {
        const inserted = await insertReport({
          kind: localDraft.kind,
          note: localDraft.note,
          lat: localDraft.lat,
          lng: localDraft.lng,
          createdAt: localDraft.createdAt,
        })
        if (inserted) {
          // Replace optimistic draft with server row (id).
          setReports((prev) => prev.map((r) => (r.id === localDraft.id ? inserted : r)))
          setSelectedId(inserted.id)
        }
      }
    } catch {
      // Leave the local pin; backend retry can come later.
    }

    setReportNote('')
    setReportKind('sighting')
    setReportOpen(false)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">BearMap</div>
        <div className="meta">Wildlife reports (approx)</div>
      </header>

      <main className="main">
        {hasSupabase() && (
          <div className="statusPill">
            Backend: {backendStatus === 'on' ? 'on' : backendStatus === 'auth' ? 'sign-in' : backendStatus}
          </div>
        )}

        <MapContainer
          className="map"
          center={[pos?.lat ?? 37.0902, pos?.lng ?? -95.7129]}
          zoom={pos ? 13 : 4}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
          <BoundsWatcher onChange={setBounds} />

          {pos && (
            <>
              <MapRecenter lat={pos.lat} lng={pos.lng} />

              {/* Safety radius around viewer */}
              <Circle
                center={[pos.lat, pos.lng]}
                radius={(radiusFt / 3.28084)}
                pathOptions={{ color: '#1b1b1b', weight: 2, fillColor: '#1b1b1b', fillOpacity: 0.08 }}
              />

              {/* Your location */}
              <CircleMarker
                center={[pos.lat, pos.lng]}
                radius={8}
                pathOptions={{ color: '#1b1b1b', weight: 3, fillColor: '#fff', fillOpacity: 1 }}
              />
            </>
          )}

          {sortedReports.map((r) => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              eventHandlers={{
                click: () => setSelectedId(r.id),
              }}
            />
          ))}
        </MapContainer>

        <div className="controls">
          <button className="btn" type="button" onClick={requestLocation}>
            {geoStatus === 'requesting' ? 'Locating…' : 'My location'}
          </button>

          {backendStatus === 'on' && (
            <button className="btn" type="button" onClick={doSignOut}>
              Sign out
            </button>
          )}

          <button
            className="btn"
            type="button"
            onClick={() => {
              const idx = radiusOptionsFt.indexOf(radiusFt)
              const next = radiusOptionsFt[(idx + 1) % radiusOptionsFt.length] ?? radiusOptionsFt[0]
              setRadiusFt(next)
            }}
            disabled={!pos}
            title="Safety radius around you"
          >
            Radius: {radiusFt >= 5280 ? `${(radiusFt / 5280).toFixed(2)} mi` : `${radiusFt} ft`}
          </button>

          <button
            className="btn"
            type="button"
            onClick={() => {
              if (backendStatus === 'auth') {
                setAuthOpen(true)
                return
              }
              setReportOpen(true)
            }}
            disabled={!canReport}
            title={backendStatus === 'auth' ? 'Sign in to share pins' : undefined}
          >
            Report
          </button>
        </div>

        {geoStatus === 'denied' && (
          <div className="banner">
            Location permission denied. Enable it in Safari settings to show your area.
          </div>
        )}

        {authOpen && (
          <div className="modalBackdrop" role="presentation" onClick={() => setAuthOpen(false)}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="modalTitle">Sign in</div>

              <div className="hint">
                Enter your email and we’ll send a magic link. After you open the link, come back here.
              </div>

              <label className="field">
                <div className="label">Email</div>
                <input
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                />
              </label>

              <div className="modalActions">
                <button className="btn" type="button" onClick={() => setAuthOpen(false)}>
                  Not now
                </button>
                <button
                  className="btn primary"
                  type="button"
                  onClick={submitAuth}
                  disabled={!authEmail.trim() || authSending}
                >
                  {authSending ? 'Sending…' : 'Send link'}
                </button>
              </div>

              {authError && (
                <div className="hint" style={{ color: '#b00020' }}>
                  Sign-in failed: {authError}
                </div>
              )}

              {authSent && (
                <div className="hint">
                  Link sent. Check your email, open the magic link, then reload this page.
                </div>
              )}
            </div>
          </div>
        )}

        {reportOpen && (
          <div className="modalBackdrop" role="presentation" onClick={() => setReportOpen(false)}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="modalTitle">Report</div>

              <div className="segmented">
                <button
                  type="button"
                  className={reportKind === 'sighting' ? 'seg active' : 'seg'}
                  onClick={() => setReportKind('sighting')}
                >
                  Sighting
                </button>
                <button
                  type="button"
                  className={reportKind === 'sign' ? 'seg active' : 'seg'}
                  onClick={() => setReportKind('sign')}
                >
                  Sign
                </button>
              </div>

              <label className="field">
                <div className="label">Note (optional)</div>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="What did you see?"
                  rows={3}
                />
              </label>

              <div className="modalActions">
                <button className="btn" type="button" onClick={() => setReportOpen(false)}>
                  Cancel
                </button>
                <button className="btn primary" type="button" onClick={submitReport} disabled={!canReport}>
                  Save pin
                </button>
              </div>

              <div className="hint">Saved locally for now. Next: share + approximate/blurred locations.</div>
            </div>
          </div>
        )}

        {selectedReport && (
          <div className="sheet" role="button" tabIndex={0} onClick={() => setSelectedId(null)}>
            <div className="sheetTitle">Selected</div>
            <div className="sheetList">
              <div className="row">
                <div className="rowMain">
                  <div className="rowKind">
                    {selectedReport.kind === 'sighting' ? 'Bear sighting' : 'Bear sign'}
                  </div>
                  <div className="rowMeta">
                    {formatAge(Date.now() - selectedReport.createdAt)}
                    {pos
                      ? ` • ${formatDistance(
                          haversineMeters(pos, { lat: selectedReport.lat, lng: selectedReport.lng }),
                        )}`
                      : ''}
                  </div>
                </div>
                {selectedReport.note && <div className="rowNote">{selectedReport.note}</div>}
                <div className="hint">Tap this card to close.</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
