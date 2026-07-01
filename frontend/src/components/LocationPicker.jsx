import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite/Webpack default marker icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT = [54.5973, -5.9301]; // Ulster University Belfast

// ── Plain-Leaflet map component (no react-leaflet) ──────────────────────────
const LeafletMap = ({ lat, lng, onPick }) => {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);

  // Boot map once
  useEffect(() => {
    if (mapRef.current) return; // already initialised

    const center = lat && lng ? [parseFloat(lat), parseFloat(lng)] : DEFAULT;
    const map = L.map(containerRef.current).setView(center, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map);
    }

    map.on('click', (e) => {
      const { lat: clat, lng: clng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clat, clng]);
      } else {
        markerRef.current = L.marker([clat, clng]).addTo(map);
      }
      onPick(clat, clng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current  = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to new position when parent passes updated lat/lng
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;
    const pos = [parseFloat(lat), parseFloat(lng)];
    mapRef.current.flyTo(pos, 16, { duration: 0.8 });
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      markerRef.current = L.marker(pos).addTo(mapRef.current);
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{ height: '300px', width: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
    />
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const LocationPicker = ({ lat, lng, name, onChange }) => {
  const [mode, setMode]           = useState('search');
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setSearchErr('');
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length === 0) setSearchErr('No results. Try a more specific address.');
      setResults(data);
    } catch {
      setSearchErr('Search failed. Check your connection.');
    } finally {
      setSearching(false);
    }
  };

  const pickResult = (r) => {
    const rlat      = parseFloat(r.lat);
    const rlon      = parseFloat(r.lon);
    const shortName = r.display_name.split(',')[0].trim();
    setResults([]);
    setQuery(r.display_name);
    onChange(rlat, rlon, shortName);
  };

  const tabStyle = (active) => ({
    flex: 1,
    padding: '0.5rem 0',
    borderRadius: '0.5rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: '600',
    transition: 'all 0.15s',
    background: active ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.04)',
    color: active ? '#fff' : '#94a3b8',
    fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

      {/* Mode tabs */}
      <div style={{
        display: 'flex', gap: '0.5rem', padding: '0.25rem',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '0.625rem', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button type="button" style={tabStyle(mode === 'search')} onClick={() => setMode('search')}>
          Search Address
        </button>
        <button type="button" style={tabStyle(mode === 'map')} onClick={() => setMode('map')}>
          Pick on Map
        </button>
      </div>

      {/* ── Address search ── */}
      {mode === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              style={{ flex: 1 }}
              type="text"
              placeholder="e.g. Ulster University, Belfast"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setResults([]); setSearchErr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ whiteSpace: 'nowrap' }}
              onClick={doSearch}
              disabled={searching}
            >
              {searching ? '…' : 'Search'}
            </button>
          </div>

          {searchErr && (
            <p style={{ fontSize: '0.78rem', color: '#f87171', margin: 0 }}>{searchErr}</p>
          )}

          {results.length > 0 && (
            <div style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '0.625rem',
              overflow: 'hidden',
              background: 'rgba(10,10,20,0.9)',
            }}>
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickResult(r)}
                  style={{
                    display: 'block', width: '100%',
                    padding: '0.7rem 1rem', textAlign: 'left',
                    background: 'transparent', border: 'none',
                    borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    color: '#cbd5e1', fontSize: '0.78rem',
                    cursor: 'pointer', lineHeight: 1.4,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontWeight: 600, color: '#e2e8f0' }}>
                    {r.display_name.split(',')[0]}
                  </span>
                  <br />
                  <span style={{ color: '#64748b' }}>
                    {r.display_name.split(',').slice(1).join(',').trim()}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p style={{ fontSize: '0.72rem', color: '#475569', margin: 0 }}>
            Powered by OpenStreetMap · no API key required
          </p>
        </div>
      )}

      {/* ── Map picker ── */}
      {mode === 'map' && (
        <div style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}>
          <LeafletMap
            lat={lat}
            lng={lng}
            onPick={(clat, clng) => onChange(clat, clng, name)}
          />
          <p style={{
            margin: 0, padding: '0.4rem 0.75rem',
            fontSize: '0.72rem', color: '#475569',
            background: 'rgba(0,0,0,0.3)',
          }}>
            Click anywhere on the map to place the campus pin
          </p>
        </div>
      )}

      {/* Coordinates preview */}
      {lat && lng && (
        <div style={{
          fontSize: '0.75rem', color: '#94a3b8',
          padding: '0.5rem 0.75rem',
          background: 'rgba(16,185,129,0.07)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '0.5rem',
          display: 'flex', gap: '1.5rem',
        }}>
          <span>Lat <strong style={{ color: '#6ee7b7' }}>{parseFloat(lat).toFixed(6)}</strong></span>
          <span>Lng <strong style={{ color: '#6ee7b7' }}>{parseFloat(lng).toFixed(6)}</strong></span>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
