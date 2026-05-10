'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import type { NominatimResult } from '@/types';

interface Props {
  onAddPlot: (name: string, lat: number, lng: number) => void;
  onPickSuggestion: (r: NominatimResult) => { lat: number; lng: number };
}

export default function Header({ onAddPlot, onPickSuggestion }: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggs, setShowSuggs] = useState(false);
  const [showCoord, setShowCoord] = useState(false);
  const [cpName, setCpName] = useState('');
  const [cpLat, setCpLat] = useState('');
  const [cpLng, setCpLng] = useState('');
  const [cpError, setCpError] = useState('');
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Capture the browser's beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Hide button if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // @ts-expect-error prompt() is non-standard
    await installPrompt.prompt();
    // @ts-expect-error userChoice is non-standard
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setSuggestions([]); setShowSuggs(false); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggs(true);
    } catch { /* silent */ }
  }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 400);
  };

  const pickSuggestion = (r: NominatimResult) => {
    onPickSuggestion(r);
    setQuery(''); setSuggestions([]); setShowSuggs(false);
  };

  const addFromCoords = () => {
    setCpError('');
    const lat = parseFloat(cpLat.trim()), lng = parseFloat(cpLng.trim());
    if (!cpLat.trim() || !cpLng.trim()) { setCpError('Enter both latitude and longitude'); return; }
    if (isNaN(lat) || isNaN(lng)) { setCpError('Use decimal format — e.g. -24.628, 25.923'); return; }
    if (lat < -90 || lat > 90) { setCpError('Latitude must be -90 to 90'); return; }
    if (lng < -180 || lng > 180) { setCpError('Longitude must be -180 to 180'); return; }
    onAddPlot(cpName.trim() || 'Plot', lat, lng);
    setCpName(''); setCpLat(''); setCpLng(''); setShowCoord(false);
  };

  return (
    <>
      <header style={{
        background: '#1a1a18', color: 'white',
        padding: '0 1rem', display: 'flex', alignItems: 'center',
        gap: '0.75rem', height: 58, flexShrink: 0, zIndex: 1000,
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-dm-serif)', fontSize: 18, lineHeight: 1 }}>PlotLocator</div>
            <div style={{ fontSize: 9, color: '#9FE1CB', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Land Finder</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowSuggs(false); }}>
          <input
            type="text"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => suggestions.length && setShowSuggs(true)}
            placeholder="🔍 Search place…"
            style={{
              width: '100%', height: 36,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 8, color: 'white', fontFamily: 'inherit',
              fontSize: 13, padding: '0 12px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {showSuggs && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#2a2a26', borderRadius: 8, overflow: 'hidden',
              zIndex: 3000, boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            }}>
              {suggestions.map(r => {
                const parts = r.display_name.split(',');
                return (
                  <div
                    key={r.place_id}
                    onMouseDown={() => pickSuggestion(r)}
                    style={{
                      padding: '10px 14px', fontSize: 13,
                      color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <strong style={{ color: 'white' }}>{parts[0].trim()}</strong>
                    {parts.length > 1 && `, ${parts.slice(1, 3).join(',')}`}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coordinates button */}
        <button
          onClick={() => setShowCoord(v => !v)}
          style={{
            height: 34, padding: '0 10px',
            background: showCoord ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7,
            color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit',
            fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          📍
        </button>

        {/* Install App button — only shows when browser offers it */}
        {installPrompt && !installed && (
          <button
            onClick={handleInstall}
            style={{
              height: 34, padding: '0 10px',
              background: '#1D9E75',
              border: 'none', borderRadius: 7,
              color: 'white', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ⬇️ Install
          </button>
        )}
      </header>

      {/* Coordinate panel */}
      {showCoord && (
        <div style={{
          background: '#1a1a18', borderBottom: '1px solid rgba(255,255,255,0.1)',
          padding: '0.9rem 1rem', display: 'flex', gap: 8,
          alignItems: 'flex-end', flexWrap: 'wrap', zIndex: 999,
        }}>
          {[
            { label: 'Plot name', val: cpName, set: setCpName, placeholder: 'e.g. Farm A', width: 110, mono: false },
            { label: 'Latitude',  val: cpLat,  set: setCpLat,  placeholder: '-24.6282',   width: 130, mono: true  },
            { label: 'Longitude', val: cpLng,  set: setCpLng,  placeholder: '25.9231',    width: 130, mono: true  },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{f.label}</label>
              <input
                value={f.val}
                onChange={e => f.set(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFromCoords()}
                placeholder={f.placeholder}
                style={{
                  height: 34, width: f.width,
                  background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 7, color: 'white',
                  fontFamily: f.mono ? 'monospace' : 'inherit',
                  fontSize: 13, padding: '0 10px', outline: 'none',
                }}
              />
            </div>
          ))}
          <button
            onClick={addFromCoords}
            style={{
              height: 34, padding: '0 16px', background: '#1D9E75', color: 'white',
              border: 'none', borderRadius: 7, fontFamily: 'inherit',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Add
          </button>
          {cpError && <div style={{ fontSize: 11, color: '#ff8a65', width: '100%' }}>⚠ {cpError}</div>}
        </div>
      )}
    </>
  );
}