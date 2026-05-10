'use client';
import type { RouteInfo } from '@/types';

interface Props {
  info: RouteInfo;
  userLocation: { lat: number; lng: number } | null;
  onClear: () => void;
}

export default function RouteCard({ info, userLocation, onClear }: Props) {
  const openGoogleMaps = () => {
    const dest = `${info.destLat},${info.destLng}`;
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    window.open(`https://www.google.com/maps/dir/${origin}/${dest}`, '_blank');
  };

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20, zIndex: 500,
      background: 'white', borderRadius: 14, borderTop: '4px solid #378ADD',
      padding: '14px 18px', minWidth: 240,
      boxShadow: '0 4px 28px rgba(0,0,0,0.18)',
      animation: 'popUp 0.25s ease',
    }}>
      <style>{`@keyframes popUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>🧭 Directions to plot</h3>

      {[
        { label: 'Destination', value: info.plotName },
        { label: 'Distance', value: info.distance },
        { label: 'Est. time', value: info.duration },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#6b6b64' }}>{row.label}</span>
          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-dm-mono), monospace', maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
        </div>
      ))}

      <button
        onClick={openGoogleMaps}
        style={{
          marginTop: 10, width: '100%', height: 32, borderRadius: 7,
          background: '#378ADD', color: 'white', border: 'none',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        🗺 Open in Google Maps
      </button>

      <button
        onClick={onClear}
        style={{
          marginTop: 6, width: '100%', height: 30, borderRadius: 6,
          border: '1px solid rgba(30,30,20,0.18)', background: 'none',
          fontSize: 12, color: '#6b6b64', cursor: 'pointer', fontFamily: 'inherit',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#ffebeb'; e.currentTarget.style.color = '#c0392b'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6b64'; }}
      >
        ✕ Clear route
      </button>
    </div>
  );
}
