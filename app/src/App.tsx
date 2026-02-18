import { useEffect, useMemo, useState } from 'react'
import { Circle, CircleMarker, MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import './App.css'
import { installLeafletDefaultIconFix } from './lib/leafletIconFix'
import type { BearReport, ReportKind } from './lib/types'
import { loadReports, saveReports } from './lib/storage'

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

export default function App() {
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'ok' | 'denied' | 'error'>('idle')
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null)
  const [reports, setReports] = useState<BearReport[]>(() => loadReports())

  const [reportOpen, setReportOpen] = useState(false)
  const [reportKind, setReportKind] = useState<ReportKind>('sighting')
  const [reportNote, setReportNote] = useState('')

  // Viewer safety radius (distance from you)
  const radiusOptionsFt = [100, 200, 500, 1320] // 0.25mi
  const [radiusFt, setRadiusFt] = useState<number>(200)

  useEffect(() => {
    saveReports(reports)
  }, [reports])

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => b.createdAt - a.createdAt),
    [reports],
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

  const canReport = geoStatus === 'ok' && !!pos

  const submitReport = () => {
    if (!pos) return
    const r: BearReport = {
      id: uuid(),
      kind: reportKind,
      note: reportNote.trim() || undefined,
      lat: pos.lat,
      lng: pos.lng,
      createdAt: Date.now(),
    }
    setReports((prev) => [r, ...prev])
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
            <Marker key={r.id} position={[r.lat, r.lng]} />
          ))}
        </MapContainer>

        <div className="controls">
          <button className="btn" type="button" onClick={requestLocation}>
            {geoStatus === 'requesting' ? 'Locating…' : 'My location'}
          </button>

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

          <button className="btn" type="button" onClick={() => setReportOpen(true)} disabled={!canReport}>
            Report
          </button>
        </div>

        {geoStatus === 'denied' && (
          <div className="banner">
            Location permission denied. Enable it in Safari settings to show your area.
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

        {sortedReports.length > 0 && (
          <div className="sheet">
            <div className="sheetTitle">Recent</div>
            <div className="sheetList">
              {sortedReports.slice(0, 5).map((r) => (
                <div key={r.id} className="row">
                  <div className="rowMain">
                    <div className="rowKind">{r.kind === 'sighting' ? 'Bear sighting' : 'Bear sign'}</div>
                    <div className="rowMeta">
                      {formatAge(Date.now() - r.createdAt)}
                      {pos ? ` • ${formatDistance(haversineMeters(pos, { lat: r.lat, lng: r.lng }))}` : ''}
                    </div>
                  </div>
                  {r.note && <div className="rowNote">{r.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
