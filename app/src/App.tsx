import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">BearMap</div>
        <div className="meta">Wildlife reports (approx)</div>
      </header>

      <main className="main">
        <MapContainer
          className="map"
          center={[37.0902, -95.7129]}
          zoom={4}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
        </MapContainer>

        <button className="fab" type="button">
          Report
        </button>
      </main>
    </div>
  )
}
