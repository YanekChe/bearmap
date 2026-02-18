import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Marker, TileLayer, useMap, ZoomControl } from 'react-leaflet'
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
                    <div className="rowMeta">{formatAge(Date.now() - r.createdAt)}</div>
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
