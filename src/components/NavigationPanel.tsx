'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { NavStep } from '@/types';

interface Props {
  plotName:     string;
  totalDist:    string;
  totalTime:    string;
  steps:        NavStep[];
  userLocation: { lat: number; lng: number } | null;
  destLat:      number;
  destLng:      number;
  onClear:      () => void;
}

export default function NavigationPanel({
  plotName, totalDist, totalTime, steps,
  userLocation, destLat, destLng, onClear,
}: Props) {
  const [stepIdx,    setStepIdx]    = useState(0);
  const [muted,      setMuted]      = useState(false);
  const [arrived,    setArrived]    = useState(false);
  const spokenRef                   = useRef<Set<number>>(new Set());
  const synthRef                    = useRef<SpeechSynthesis | null>(null);

  // Initialise speech synthesis once
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (muted || !synthRef.current) return;
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang  = 'en-US';
    utt.rate  = 0.95;
    synthRef.current.speak(utt);
  }, [muted]);

  // Speak the first instruction on mount
  useEffect(() => {
    if (steps.length > 0) speak(steps[0].instruction);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance step index as user moves — compare distance to next maneuver point
  useEffect(() => {
    if (!userLocation || arrived || steps.length === 0) return;

    const current = steps[stepIdx];
    if (!current) return;

    const dist = haversine(userLocation.lat, userLocation.lng, current.lat, current.lng);

    // Within 30 m of the maneuver point → advance to next step
    if (dist < 30) {
      const next = stepIdx + 1;
      if (next >= steps.length) {
        setArrived(true);
        speak('You have arrived at your destination.');
        return;
      }
      setStepIdx(next);
      if (!spokenRef.current.has(next)) {
        spokenRef.current.add(next);
        speak(steps[next].instruction);
      }
    } else if (dist < 200 && !spokenRef.current.has(stepIdx)) {
      // Approaching — speak current instruction once
      spokenRef.current.add(stepIdx);
      speak(current.instruction);
    }
  }, [userLocation, stepIdx, steps, arrived, speak]);

  // Check arrival at destination independently
  useEffect(() => {
    if (!userLocation || arrived) return;
    const dist = haversine(userLocation.lat, userLocation.lng, destLat, destLng);
    if (dist < 25) {
      setArrived(true);
      speak('You have arrived at your destination.');
    }
  }, [userLocation, destLat, destLng, arrived, speak]);

  const currentStep = steps[stepIdx];
  const nextStep    = steps[stepIdx + 1];
  const remaining   = steps.slice(stepIdx).reduce((s, st) => s + st.distance, 0);

  const openGoogleMaps = () => {
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
    window.open(`https://www.google.com/maps/dir/${origin}/${destLat},${destLng}`, '_blank');
  };

  if (arrived) {
    return (
      <div style={panelStyle}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#085041' }}>Arrived!</div>
          <div style={{ fontSize: 13, color: '#6b6b64', marginTop: 2 }}>{plotName}</div>
        </div>
        <button onClick={onClear} style={clearBtnStyle}>✕ End navigation</button>
      </div>
    );
  }

  return (
    <div style={panelStyle}>

      {/* Current instruction */}
      <div style={{
        background: '#378ADD', borderRadius: 10, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: 8,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          {maneuverIcon(currentStep?.maneuverType, currentStep?.modifier)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>
            {currentStep?.instruction ?? 'Calculating…'}
          </div>
          {currentStep && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              in {fmtDist(currentStep.distance)}
            </div>
          )}
        </div>
      </div>

      {/* Next step preview */}
      {nextStep && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', background: '#f7f4ee', borderRadius: 8, marginBottom: 10,
        }}>
          <div style={{ fontSize: 16, flexShrink: 0 }}>
            {maneuverIcon(nextStep.maneuverType, nextStep.modifier)}
          </div>
          <div style={{ flex: 1, fontSize: 12, color: '#3a3a36', lineHeight: 1.3 }}>
            <span style={{ color: '#6b6b64', marginRight: 4 }}>Then:</span>
            {nextStep.instruction}
          </div>
          <div style={{ fontSize: 11, color: '#6b6b64', flexShrink: 0 }}>
            {fmtDist(nextStep.distance)}
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 6, marginBottom: 10,
      }}>
        {[
          { label: 'Remaining', value: fmtDist(remaining) },
          { label: 'Est. time', value: totalTime },
          { label: 'Destination', value: plotName },
        ].map(c => (
          <div key={c.label} style={{
            background: '#f7f4ee', borderRadius: 7,
            padding: '6px 8px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 9, color: '#6b6b64', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.label}</div>
            <div style={{
              fontSize: 12, fontWeight: 600, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Steps list */}
      <div style={{
        maxHeight: 160, overflowY: 'auto',
        borderRadius: 8, border: '1px solid rgba(30,30,20,0.1)',
        marginBottom: 10,
      }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '7px 10px',
            background: i === stepIdx ? '#EBF4FF' : 'transparent',
            borderBottom: i < steps.length - 1 ? '1px solid rgba(30,30,20,0.07)' : 'none',
          }}>
            <div style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
              {maneuverIcon(s.maneuverType, s.modifier)}
            </div>
            <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4, color: i === stepIdx ? '#0c447c' : '#3a3a36' }}>
              {s.instruction}
            </div>
            <div style={{ fontSize: 11, color: '#6b6b64', flexShrink: 0, marginTop: 1 }}>
              {fmtDist(s.distance)}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setMuted(m => !m)} style={{
          flex: 1, height: 32, borderRadius: 7,
          border: '1px solid rgba(30,30,20,0.18)',
          background: muted ? '#ffebeb' : 'none',
          color: muted ? '#c0392b' : '#3a3a36',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {muted ? '🔇 Muted' : '🔊 Voice on'}
        </button>
        <button onClick={openGoogleMaps} style={{
          flex: 1, height: 32, borderRadius: 7,
          background: '#1D9E75', color: 'white', border: 'none',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          🗺 Google Maps
        </button>
        <button onClick={onClear} style={{
          height: 32, padding: '0 12px', borderRadius: 7,
          border: '1px solid rgba(30,30,20,0.18)',
          background: 'none', color: '#6b6b64',
          fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ffebeb'; e.currentTarget.style.color = '#c0392b'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b6b64'; }}
        >✕</button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6_371_000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m: number): string {
  if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
  return Math.round(m) + ' m';
}

function maneuverIcon(type?: string, modifier?: string): string {
  if (!type) return '➡️';
  if (type === 'arrive')       return '🏁';
  if (type === 'depart')       return '🚦';
  if (type === 'roundabout' || type === 'rotary') return '🔄';
  if (type === 'fork')         return modifier?.includes('left') ? '↖️' : '↗️';
  if (type === 'merge')        return '🔀';
  if (type === 'on ramp')      return '↗️';
  if (type === 'off ramp')     return modifier?.includes('left') ? '↙️' : '↘️';
  // turn / continue / new name / end of road
  switch (modifier) {
    case 'left':           return '⬅️';
    case 'right':          return '➡️';
    case 'slight left':    return '↖️';
    case 'slight right':   return '↗️';
    case 'sharp left':     return '↩️';
    case 'sharp right':    return '↪️';
    case 'uturn':          return '🔃';
    default:               return '⬆️';
  }
}

const panelStyle: React.CSSProperties = {
  position: 'absolute', bottom: 20, left: 20, zIndex: 500,
  background: 'white', borderRadius: 14, borderTop: '4px solid #378ADD',
  padding: '14px 16px', width: 310,
  boxShadow: '0 4px 28px rgba(0,0,0,0.18)',
  animation: 'popUp 0.25s ease',
};

const clearBtnStyle: React.CSSProperties = {
  marginTop: 10, width: '100%', height: 32, borderRadius: 7,
  border: '1px solid rgba(30,30,20,0.18)', background: 'none',
  fontSize: 12, color: '#6b6b64', cursor: 'pointer', fontFamily: 'inherit',
};
