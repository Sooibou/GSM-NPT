import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet'
import L from 'leaflet'
import './App.css'
import { useState, useRef } from 'react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-shadow.png',
})

const createColoredIcon = (color) => {
  return new L.DivIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 4px solid white; box-shadow: 0 0 15px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
    </div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  })
}

const COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#FFA500', '#00FFFF', '#FF1493', '#32CD32', '#FFD700', '#8B00FF']

function App() {
  const [sites, setSites] = useState([])
  const [selectedSite, setSelectedSite] = useState(null)
  const [showAddSite, setShowAddSite] = useState(false)
  const [viewMode, setViewMode] = useState('coverage')
  const [showResults, setShowResults] = useState(false)
  const [globalStats, setGlobalStats] = useState(null)
  const mapRef = useRef(null)
 
  // Nouveaux états pour les contrôles
  const [showSectors, setShowSectors] = useState(true)
  const [showCoverage, setShowCoverage] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [show3D, setShow3D] = useState(false)

  const [newSite, setNewSite] = useState({
    name: '',
    lat: 14.6928,
    lon: -17.4467,
    txPower: 43,
    frequency: 900,
    txAntennaGain: 18,
    txAntennaHeight: 30,
    rxAntennaHeight: 1.5,
    rxSensitivity: -104,
    fadeMargin: 10,
    cableLoss: 3,
    environment: 'urban',
    traffic: 25,
    numChannels: 8,
    azimuth: 0,
    beamwidth: 120,
    sectors: 1
  })

  // CORRECTION: Calcul du bilan de liaison
  const calculateLinkBudget = (site) => {
    const eirp = site.txPower + site.txAntennaGain - site.cableLoss
    const rxPowerMin = site.rxSensitivity
    const plMax = eirp - rxPowerMin - site.fadeMargin
    return { eirp, plMax }
  }

  // CORRECTION: Modèle Okumura-Hata corrigé
  const calculatePathLoss = (site, distance) => {
    if (distance < 0.1) return 50 // Distance minimale
   
    const f = site.frequency
    const hb = site.txAntennaHeight
    const hm = site.rxAntennaHeight

    // Facteur de correction pour la hauteur du mobile
    let aCorrectionFactor
    if (site.environment === 'urban') {
      if (f >= 400) {
        aCorrectionFactor = 3.2 * Math.pow(Math.log10(11.75 * hm), 2) - 4.97
      } else {
        aCorrectionFactor = (1.1 * Math.log10(f) - 0.7) * hm - (1.56 * Math.log10(f) - 0.8)
      }
    } else {
      aCorrectionFactor = (1.1 * Math.log10(f) - 0.7) * hm - (1.56 * Math.log10(f) - 0.8)
    }

    // Formule Okumura-Hata de base
    let pathLoss = 69.55 + 26.16 * Math.log10(f) - 13.82 * Math.log10(hb) - aCorrectionFactor + (44.9 - 6.55 * Math.log10(hb)) * Math.log10(distance)

    // Corrections environnementales
    if (site.environment === 'suburban') {
      pathLoss -= 2 * Math.pow(Math.log10(f / 28), 2) + 5.4
    } else if (site.environment === 'rural') {
      pathLoss -= 4.78 * Math.pow(Math.log10(f), 2) + 18.33 * Math.log10(f) - 40.94
    }

    return pathLoss
  }

  const erlangB = (traffic, channels) => {
    let erlang = 1.0
    for (let i = 1; i <= channels; i++) {
      erlang = (traffic * erlang) / (i + traffic * erlang)
    }
    return erlang
  }

  const kmToLatDegrees = (km) => km / 111.32
  const kmToLonDegrees = (km, lat) => km / (111.32 * Math.cos(lat * Math.PI / 180))

  const getColorForRSSI = (rssi) => {
    if (rssi > -70) return '#00ff00'
    if (rssi > -85) return '#80ff00'
    if (rssi > -95) return '#ffff00'
    if (rssi > -105) return '#ff8000'
    return '#ff0000'
  }

  // Fonction pour calculer les interférences
  const calculateInterference = (lat, lon) => {
    const signals = []
   
    sites.forEach(site => {
      // Calculer la distance entre le point et le site
      const dx = (lon - site.lon) * 111.32 * Math.cos(lat * Math.PI / 180)
      const dy = (lat - site.lat) * 111.32
      let distance = Math.sqrt(dx * dx + dy * dy)
     
      if (distance < 0.1) distance = 0.1
     
      // Calculer le RSSI pour ce site
      const pl = calculatePathLoss(site, distance)
      const rssi = site.txPower + site.txAntennaGain - site.cableLoss - pl
     
      signals.push({ rssi, siteId: site.id, frequency: site.frequency })
    })
   
    // Trier par puissance décroissante
    signals.sort((a, b) => b.rssi - a.rssi)
   
    // Signal le plus fort
    const strongest = signals[0]
   
    // Calculer les interférences co-canal (même fréquence)
    const coChannelInterference = signals
      .filter(s => s.frequency === strongest.frequency && s.siteId !== strongest.siteId)
      .reduce((sum, s) => sum + Math.pow(10, s.rssi / 10), 0)
   
    const cir = strongest.rssi - 10 * Math.log10(coChannelInterference || 0.000001)
   
    return {
      cir,
      dominantSite: strongest.siteId,
      numInterferors: signals.filter(s => s.siteId !== strongest.siteId && s.rssi > -100).length
    }
  }

  const getColorForCIR = (cir) => {
    if (cir > 18) return '#00ff41'      // Vert fluo - Excellent
    if (cir > 12) return '#39ff14'      // Vert citron - Bon
    if (cir > 9) return '#ffff00'       // Jaune vif - Acceptable
    if (cir > 6) return '#ff8c00'       // Orange vif - Mauvais
    return '#ff0040'                    // Rouge fluo - Très mauvais (interférence forte)
  }

  const handleAddSite = () => {
    if (!newSite.name.trim()) {
      alert('Veuillez entrer un nom pour le site')
      return
    }

    const siteWithId = {
      ...newSite,
      id: Date.now(),
      color: COLORS[sites.length % COLORS.length],
      coveragePoints: [],
      maxDistance: 0,
      results: null
    }

    const calculatedSite = calculateSiteCoverage(siteWithId)
    setSites([...sites, calculatedSite])
   
    setShowAddSite(false)
    setNewSite({
      name: '',
      lat: 14.6928,
      lon: -17.4467,
      txPower: 43,
      frequency: 900,
      txAntennaGain: 18,
      txAntennaHeight: 30,
      rxAntennaHeight: 1.5,
      rxSensitivity: -104,
      fadeMargin: 10,
      cableLoss: 3,
      environment: 'urban',
      traffic: 25,
      numChannels: 8,
      azimuth: 0,
      beamwidth: 120,
      sectors: 1
    })
  }

  // CORRECTION: Calcul de couverture avec plus de points pour heatmap
  const calculateSiteCoverage = (site) => {
    const { plMax } = calculateLinkBudget(site)

    // Trouver la distance maximale de couverture
    let maxDistance = 0.1
    for (let d = 0.1; d <= 30; d += 0.05) {
      const pl = calculatePathLoss(site, d)
      if (pl <= plMax) {
        maxDistance = d
      } else {
        break
      }
    }

    // CORRECTION: Générer beaucoup plus de points pour une vraie heatmap
    const points = []
    const sectorsToGenerate = site.sectors || 1
    const anglePerSector = 360 / sectorsToGenerate

    for (let sector = 0; sector < sectorsToGenerate; sector++) {
      const sectorAzimuth = site.azimuth + (sector * anglePerSector)
      const startAngle = (sectorAzimuth - site.beamwidth / 2) * Math.PI / 180
      const endAngle = (sectorAzimuth + site.beamwidth / 2) * Math.PI / 180

      // AUGMENTER le nombre de points
      const numCircles = 15  // Plus de cercles
      const numPointsPerArc = 30  // Plus de points par arc

      for (let circle = 1; circle <= numCircles; circle++) {
        const radius = (circle / numCircles) * maxDistance
       
        for (let i = 0; i <= numPointsPerArc; i++) {
          const angle = startAngle + (i / numPointsPerArc) * (endAngle - startAngle)
          const x = radius * Math.cos(angle)
          const y = radius * Math.sin(angle)
         
          const distance = Math.sqrt(x * x + y * y)
          if (distance < 0.1) continue

          const pl = calculatePathLoss(site, distance)
          const rssi = site.txPower + site.txAntennaGain - site.cableLoss - pl

          const lat = site.lat + kmToLatDegrees(y)
          const lon = site.lon + kmToLonDegrees(x, site.lat)

          points.push({
            lat,
            lon,
            rssi,
            distance: distance.toFixed(2),
            color: getColorForRSSI(rssi),
            sector
          })
        }
      }
    }

    const blockingProb = erlangB(site.traffic, site.numChannels)
    const capacity = site.numChannels * (1 - blockingProb)

    return {
      ...site,
      coveragePoints: points,
      maxDistance,
      results: {
        ...calculateLinkBudget(site),
        maxDistance: maxDistance.toFixed(2),
        cellArea: (Math.PI * maxDistance * maxDistance).toFixed(2),
        blockingProbability: (blockingProb * 100).toFixed(3),
        effectiveCapacity: capacity.toFixed(2)
      }
    }
  }

  const handleDeleteSite = (id) => {
    setSites(sites.filter(s => s.id !== id))
    if (selectedSite?.id === id) setSelectedSite(null)
  }

  const handleUpdateSite = (id, updates) => {
    const updatedSites = sites.map(site => {
      if (site.id === id) {
        const updated = { ...site, ...updates }
        return calculateSiteCoverage(updated)
      }
      return site
    })
    setSites(updatedSites)
    if (selectedSite?.id === id) {
      setSelectedSite(updatedSites.find(s => s.id === id))
    }
  }

  const calculateGlobalStats = () => {
    if (sites.length === 0) return

    const totalArea = sites.reduce((sum, site) => sum + parseFloat(site.results.cellArea), 0)
    const totalCapacity = sites.reduce((sum, site) => sum + parseFloat(site.results.effectiveCapacity), 0)
    const avgBlockingProb = sites.reduce((sum, site) => sum + parseFloat(site.results.blockingProbability), 0) / sites.length

    setGlobalStats({
      totalSites: sites.length,
      totalArea: totalArea.toFixed(2),
      totalCapacity: totalCapacity.toFixed(2),
      avgBlockingProb: avgBlockingProb.toFixed(3)
    })
    setShowResults(true)
  }

  const getSectorPolygon = (site) => {
    const sectorsToGenerate = site.sectors || 1
    const anglePerSector = 360 / sectorsToGenerate
    const polygons = []

    for (let sector = 0; sector < sectorsToGenerate; sector++) {
      const sectorAzimuth = site.azimuth + (sector * anglePerSector)
      const startAngle = (sectorAzimuth - site.beamwidth / 2) * Math.PI / 180
      const endAngle = (sectorAzimuth + site.beamwidth / 2) * Math.PI / 180
     
      const points = [[site.lat, site.lon]]
      const numPoints = 30
     
      for (let i = 0; i <= numPoints; i++) {
        const angle = startAngle + (i / numPoints) * (endAngle - startAngle)
        const x = site.maxDistance * Math.cos(angle)
        const y = site.maxDistance * Math.sin(angle)
       
        const lat = site.lat + kmToLatDegrees(y)
        const lon = site.lon + kmToLonDegrees(x, site.lat)
        points.push([lat, lon])
      }
     
      points.push([site.lat, site.lon])
      polygons.push(points)
    }

    return polygons
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">📡</div>
            <div>
              <h1>GSM Network Planning Tool</h1>
              <p>Professional Radio Coverage & Capacity Planning Platform</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Sites</span>
              <span className="stat-value">{sites.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Mode</span>
              <span className="stat-value">{viewMode.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn-primary" onClick={() => setShowAddSite(true)}>
          <span>➕</span> Ajouter Site
        </button>
        <button className="btn-secondary" onClick={calculateGlobalStats} disabled={sites.length === 0}>
          <span>📊</span> Analyser
        </button>
        <button className="btn-secondary" onClick={() => {
          const data = {
            sites: sites.map(s => ({
              name: s.name,
              lat: s.lat,
              lon: s.lon,
              frequency: s.frequency,
              txPower: s.txPower,
              results: s.results
            }))
          }
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'gsm_network.json'
          a.click()
        }} disabled={sites.length === 0}>
          <span>💾</span> Exporter
        </button>
       
        {/* TOGGLES DE VISUALISATION */}
        <div className="toggle-container">
          <span className="toggle-label">Secteurs</span>
          <div className={`toggle-switch ${showSectors ? 'active' : ''}`} onClick={() => setShowSectors(!showSectors)}>
            <div className="toggle-slider"></div>
          </div>
        </div>
       
        <div className="toggle-container">
          <span className="toggle-label">Couverture</span>
          <div className={`toggle-switch ${showCoverage ? 'active' : ''}`} onClick={() => setShowCoverage(!showCoverage)}>
            <div className="toggle-slider"></div>
          </div>
        </div>
       
        <div className="toggle-container">
          <span className="toggle-label">Labels</span>
          <div className={`toggle-switch ${showLabels ? 'active' : ''}`} onClick={() => setShowLabels(!showLabels)}>
            <div className="toggle-slider"></div>
          </div>
        </div>
       
        <div className="view-mode-selector">
          <button className={viewMode === 'coverage' ? 'active' : ''} onClick={() => setViewMode('coverage')}>
            📶 Couverture
          </button>
          <button className={viewMode === 'interference' ? 'active' : ''} onClick={() => setViewMode('interference')}>
            ⚡ Interférence
          </button>
          <button className={viewMode === 'all' ? 'active' : ''} onClick={() => setViewMode('all')}>
            🗺️ Tout
          </button>
        </div>
      </div>

      <div className="main-container">
        <div className="sidebar">
          <h2>🗼 Sites Actifs ({sites.length})</h2>
          <div className="sites-list">
            {sites.map(site => (
              <div key={site.id} className={`site-item ${selectedSite?.id === site.id ? 'selected' : ''}`} onClick={() => setSelectedSite(site)}>
                <div className="site-header">
                  <div className="site-color" style={{ backgroundColor: site.color }}></div>
                  <div className="site-name">{site.name}</div>
                  <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }}>🗑️</button>
                </div>
                <div className="site-info">
                  <div>📍 {site.lat.toFixed(4)}, {site.lon.toFixed(4)}</div>
                  <div>📡 {site.frequency} MHz • {site.environment}</div>
                  <div>📏 {site.results?.maxDistance} km</div>
                  <div>📊 {site.results?.effectiveCapacity} canaux</div>
                </div>
              </div>
            ))}
            {sites.length === 0 && (
              <div className="empty-state">
                <p>Aucun site configuré</p>
                <p>Cliquez sur "Ajouter Site" pour commencer</p>
              </div>
            )}
          </div>
        </div>

        <div className="main-content">
          <div className="map-container">
            <MapContainer center={[14.6928, -17.4467]} zoom={12} style={{ height: '100%', width: '100%' }} ref={mapRef}>
              <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {sites.map(site => (
                <div key={site.id}>
                  <Marker position={[site.lat, site.lon]} icon={createColoredIcon(site.color)}>
                    <Popup>
                      <div className="popup-content">
                        <h3>{site.name}</h3>
                        <p><strong>Fréquence:</strong> {site.frequency} MHz</p>
                        <p><strong>Puissance:</strong> {site.txPower} dBm</p>
                        <p><strong>Hauteur:</strong> {site.txAntennaHeight} m</p>
                        <p><strong>Portée:</strong> {site.results?.maxDistance} km</p>
                        <p><strong>Capacité:</strong> {site.results?.effectiveCapacity} canaux</p>
                      </div>
                    </Popup>
                  </Marker>
                  {/* Secteurs - contrôlés par toggle */}
                  {showSectors && viewMode !== 'interference' && getSectorPolygon(site).map((polygon, idx) => (
                    <Polyline key={`sector-${site.id}-${idx}`} positions={polygon} pathOptions={{ color: site.color, weight: 2, opacity: 0.6, fillOpacity: 0.1, fillColor: site.color }} />
                  ))}
                  {/* Points de couverture - contrôlés par toggle */}
                  {showCoverage && (viewMode === 'coverage' || viewMode === 'all') && site.coveragePoints.map((point, idx) => (
                    <Circle
                      key={`point-${site.id}-${idx}`}
                      center={[point.lat, point.lon]}
                      radius={50}
                      pathOptions={{
                        color: point.color,
                        fillColor: point.color,
                        fillOpacity: 0.6,
                        weight: 0
                      }}
                    />
                  ))}
                  {viewMode !== 'interference' && (
                    <Circle center={[site.lat, site.lon]} radius={site.maxDistance * 1000} pathOptions={{ color: site.color, fillOpacity: 0, weight: 2, dashArray: '10, 10' }} />
                  )}
                </div>
              ))}

              {/* MODE INTERFÉRENCE: Afficher la carte C/I avec cercles concentriques - AMÉLIORÉ */}
              {viewMode === 'interference' && sites.length >= 2 && (() => {
                const interferenceCircles = []
               
                // Pour chaque site, créer des cercles concentriques
                sites.forEach(site => {
                  const numRings = 30 // AUGMENTÉ: Plus d'anneaux pour un dégradé fluide
                  const maxRadius = site.maxDistance
                 
                  for (let ring = 1; ring <= numRings; ring++) {
                    const radius = (ring / numRings) * maxRadius
                    const numPoints = 80 // AUGMENTÉ: Plus de points par anneau pour éviter les espaces
                   
                    for (let i = 0; i < numPoints; i++) {
                      const angle = (i / numPoints) * 2 * Math.PI
                      const x = radius * Math.cos(angle)
                      const y = radius * Math.sin(angle)
                     
                      const lat = site.lat + kmToLatDegrees(y)
                      const lon = site.lon + kmToLonDegrees(x, site.lat)
                     
                      const interference = calculateInterference(lat, lon)
                     
                      interferenceCircles.push({
                        lat,
                        lon,
                        cir: interference.cir,
                        color: getColorForCIR(interference.cir),
                        numInterferors: interference.numInterferors,
                        radius: 60 // AUGMENTÉ: Rayon plus grand pour combler les espaces
                      })
                    }
                  }
                })

                return interferenceCircles.map((point, idx) => (
                  <Circle
                    key={`interference-${idx}`}
                    center={[point.lat, point.lon]}
                    radius={point.radius}
                    pathOptions={{
                      color: point.color,
                      fillColor: point.color,
                      fillOpacity: 0.8,
                      weight: 0
                    }}
                  >
                    <Popup>
                      <strong>C/I Ratio:</strong> {point.cir.toFixed(2)} dB<br/>
                      <strong>Interférences:</strong> {point.numInterferors}<br/>
                      <strong>Qualité:</strong> {
                        point.cir > 18 ? '🟢 Excellente' :
                        point.cir > 12 ? '🟡 Bonne' :
                        point.cir > 9 ? '🟠 Acceptable' :
                        point.cir > 6 ? '🔴 Mauvaise' : '⛔ Critique'
                      }
                    </Popup>
                  </Circle>
                ))
              })()}
            </MapContainer>
            <div className="map-legend">
              <h4>{viewMode === 'interference' ? 'Rapport C/I (Carrier-to-Interference)' : 'Niveau de Signal (RSSI)'}</h4>
              <div className="legend-items">
                {viewMode === 'interference' ? (
                  <>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#00ff41' }}></div><span>🟢 Excellent (&gt; 18 dB)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#39ff14' }}></div><span>🟢 Bon (12-18 dB)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#ffff00' }}></div><span>🟡 Acceptable (9-12 dB)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#ff8c00' }}></div><span>🟠 Mauvais (6-9 dB)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#ff0040' }}></div><span>🔴 Critique (&lt; 6 dB)</span></div>
                  </>
                ) : (
                  <>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#00ff00' }}></div><span>Excellent (&gt; -70 dBm)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#80ff00' }}></div><span>Très bon (-70 à -85 dBm)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#ffff00' }}></div><span>Bon (-85 à -95 dBm)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#ff8000' }}></div><span>Moyen (-95 à -105 dBm)</span></div>
                    <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#ff0000' }}></div><span>Faible (&lt; -105 dBm)</span></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {selectedSite && (
            <div className="details-panel">
              <div className="details-header">
                <h3>⚙️ Configuration: {selectedSite.name}</h3>
                <button onClick={() => setSelectedSite(null)}>✖️</button>
              </div>
              <div className="details-content">
                <div className="param-group">
                  <h4>📍 Localisation</h4>
                  <div className="param-row"><label>Latitude</label><input type="number" step="0.0001" value={selectedSite.lat} onChange={(e) => handleUpdateSite(selectedSite.id, { lat: parseFloat(e.target.value) })} /></div>
                  <div className="param-row"><label>Longitude</label><input type="number" step="0.0001" value={selectedSite.lon} onChange={(e) => handleUpdateSite(selectedSite.id, { lon: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="param-group">
                  <h4>📡 Paramètres Radio</h4>
                  <div className="param-row"><label>Fréquence (MHz)</label><select value={selectedSite.frequency} onChange={(e) => handleUpdateSite(selectedSite.id, { frequency: parseFloat(e.target.value) })}><option value="900">GSM 900</option><option value="1800">DCS 1800</option></select></div>
                  <div className="param-row"><label>Puissance TX (dBm)</label><input type="number" value={selectedSite.txPower} onChange={(e) => handleUpdateSite(selectedSite.id, { txPower: parseFloat(e.target.value) })} /></div>
                  <div className="param-row"><label>Gain antenne (dBi)</label><input type="number" value={selectedSite.txAntennaGain} onChange={(e) => handleUpdateSite(selectedSite.id, { txAntennaGain: parseFloat(e.target.value) })} /></div>
                  <div className="param-row"><label>Hauteur (m)</label><input type="number" value={selectedSite.txAntennaHeight} onChange={(e) => handleUpdateSite(selectedSite.id, { txAntennaHeight: parseFloat(e.target.value) })} /></div>
                </div>
                <div className="param-group">
                  <h4>📐 Secteur</h4>
                  <div className="param-row"><label>Azimuth (°)</label><input type="number" value={selectedSite.azimuth} onChange={(e) => handleUpdateSite(selectedSite.id, { azimuth: parseFloat(e.target.value) })} /></div>
                  <div className="param-row"><label>Ouverture (°)</label><input type="number" value={selectedSite.beamwidth} onChange={(e) => handleUpdateSite(selectedSite.id, { beamwidth: parseFloat(e.target.value) })} /></div>
                  <div className="param-row"><label>Nombre de secteurs</label><select value={selectedSite.sectors} onChange={(e) => handleUpdateSite(selectedSite.id, { sectors: parseInt(e.target.value) })}><option value="1">1 (Omnidirectionnel)</option><option value="3">3 (Tri-sectoriel)</option><option value="6">6 (Hexa-sectoriel)</option></select></div>
                </div>
                <div className="param-group">
                  <h4>🌍 Environnement</h4>
                  <div className="param-row"><label>Type</label><select value={selectedSite.environment} onChange={(e) => handleUpdateSite(selectedSite.id, { environment: e.target.value })}><option value="urban">Urbain</option><option value="suburban">Suburbain</option><option value="rural">Rural</option></select></div>
                </div>
                <div className="results-summary">
                  <h4>📊 Résultats</h4>
                  <div className="result-item"><span>PIRE:</span><strong>{selectedSite.results?.eirp.toFixed(2)} dBm</strong></div>
                  <div className="result-item"><span>Portée max:</span><strong>{selectedSite.results?.maxDistance} km</strong></div>
                  <div className="result-item"><span>Surface:</span><strong>{selectedSite.results?.cellArea} km²</strong></div>
                  <div className="result-item"><span>Capacité:</span><strong>{selectedSite.results?.effectiveCapacity} canaux</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddSite && (
        <div className="modal-overlay" onClick={() => setShowAddSite(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>➕ Nouveau Site</h2><button onClick={() => setShowAddSite(false)}>✖️</button></div>
            <div className="modal-content">
              <div className="form-row"><label>Nom du site *</label><input type="text" value={newSite.name} onChange={(e) => setNewSite({...newSite, name: e.target.value})} placeholder="Ex: BTS-Plateau-01" /></div>
              <div className="form-row-group">
                <div className="form-row"><label>Latitude</label><input type="number" step="0.0001" value={newSite.lat} onChange={(e) => setNewSite({...newSite, lat: parseFloat(e.target.value)})} /></div>
                <div className="form-row"><label>Longitude</label><input type="number" step="0.0001" value={newSite.lon} onChange={(e) => setNewSite({...newSite, lon: parseFloat(e.target.value)})} /></div>
              </div>
              <div className="form-row-group">
                <div className="form-row"><label>Fréquence</label><select value={newSite.frequency} onChange={(e) => setNewSite({...newSite, frequency: parseFloat(e.target.value)})}><option value="900">GSM 900 MHz</option><option value="1800">DCS 1800 MHz</option></select></div>
                <div className="form-row"><label>Environnement</label><select value={newSite.environment} onChange={(e) => setNewSite({...newSite, environment: e.target.value})}><option value="urban">Urbain</option><option value="suburban">Suburbain</option><option value="rural">Rural</option></select></div>
              </div>
              <div className="form-row-group">
                <div className="form-row"><label>Puissance TX (dBm)</label><input type="number" value={newSite.txPower} onChange={(e) => setNewSite({...newSite, txPower: parseFloat(e.target.value)})} /></div>
                <div className="form-row"><label>Gain antenne (dBi)</label><input type="number" value={newSite.txAntennaGain} onChange={(e) => setNewSite({...newSite, txAntennaGain: parseFloat(e.target.value)})} /></div>
              </div>
              <div className="form-row"><label>Nombre de secteurs</label><select value={newSite.sectors} onChange={(e) => setNewSite({...newSite, sectors: parseInt(e.target.value)})}><option value="1">1 - Omnidirectionnel</option><option value="3">3 - Tri-sectoriel</option><option value="6">6 - Hexa-sectoriel</option></select></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddSite(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleAddSite}>Créer Site</button>
            </div>
          </div>
        </div>
      )}

      {showResults && globalStats && (
        <div className="modal-overlay" onClick={() => setShowResults(false)}>
          <div className="modal results-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>📊 Analyse Globale du Réseau</h2><button onClick={() => setShowResults(false)}>✖️</button></div>
            <div className="modal-content">
              <div className="global-stats">
                <div className="stat-card blue"><div className="stat-icon">🗼</div><div className="stat-info"><div className="stat-label">Sites Actifs</div><div className="stat-number">{globalStats.totalSites}</div></div></div>
                <div className="stat-card green"><div className="stat-icon">📡</div><div className="stat-info"><div className="stat-label">Surface Totale</div><div className="stat-number">{globalStats.totalArea} km²</div></div></div>
                <div className="stat-card orange"><div className="stat-icon">📊</div><div className="stat-info"><div className="stat-label">Capacité Totale</div><div className="stat-number">{globalStats.totalCapacity} canaux</div></div></div>
                <div className="stat-card purple"><div className="stat-icon">⚠️</div><div className="stat-info"><div className="stat-label">Blocage Moyen</div><div className="stat-number">{globalStats.avgBlockingProb}%</div></div></div>
              </div>
              <div className="sites-table">
                <h3>Détails par Site</h3>
                <table>
                  <thead><tr><th>Site</th><th>Fréq.</th><th>Portée</th><th>Surface</th><th>Capacité</th><th>Blocage</th></tr></thead>
                  <tbody>
                    {sites.map(site => (
                      <tr key={site.id}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: site.color }}></div>{site.name}</div></td>
                        <td>{site.frequency} MHz</td>
                        <td>{site.results?.maxDistance} km</td>
                        <td>{site.results?.cellArea} km²</td>
                        <td>{site.results?.effectiveCapacity} canaux</td>
                        <td>{site.results?.blockingProbability}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
