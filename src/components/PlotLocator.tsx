'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Plot, RouteInfo, NavStep, NominatimResult } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import Sidebar          from './Sidebar';
import Header           from './Header';
import NavigationPanel  from './NavigationPanel';
import MapView          from './MapView';

const COLORS = [
  '#1D9E75','#378ADD','#D85A30','#D4537E',
  '#7F77DD','#BA7517','#3B6D11','#A32D2D',
  '#0F6E56','#185FA5',
];

interface ActiveRoute extends RouteInfo {
  steps: NavStep[];
}

export default function PlotLocator() {
  const [plots,        setPlots]        = useState<Plot[]>([]);
  const [activeRoute,  setActiveRoute]  = useState<ActiveRoute | null>(null);
  const [activeRouteId,setActiveRouteId]= useState<number | null>(null);
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [banner,       setBanner]       = useState<string | null>(null);
  const geo            = useGeolocation();
  const bannerTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((msg: string) => {
    setBanner(msg);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 4500);
  }, []);

  useEffect(() => { if (geo.error) showBanner(geo.error); }, [geo.error, showBanner]);
  useEffect(() => { geo.request(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Keep liveLocation seeded from initial geo fix
  useEffect(() => {
    if (geo.location && !liveLocation) setLiveLocation(geo.location);
  }, [geo.location, liveLocation]);

  const addPlot = useCallback((name: string, lat: number, lng: number) => {
    setPlots(prev => [
      ...prev,
      { id: Date.now(), name, lat, lng, color: COLORS[prev.length % COLORS.length] },
    ]);
  }, []);

  const removePlot = useCallback((id: number) => {
    if (activeRouteId === id) { setActiveRouteId(null); setActiveRoute(null); }
    setPlots(prev => prev.filter(p => p.id !== id));
  }, [activeRouteId]);

  const clearAll = useCallback(() => {
    setPlots([]); setActiveRouteId(null); setActiveRoute(null);
  }, []);

  const handlePickSuggestion = useCallback((r: NominatimResult) => {
    const lat  = parseFloat(r.lat);
    const lng  = parseFloat(r.lon);
    const name = r.display_name.split(',')[0].trim();
    addPlot(name, lat, lng);
    return { lat, lng };
  }, [addPlot]);

  const handleRouteFound = useCallback((
    plotId: number, plotName: string,
    distM: number, timeS: number,
    lat: number, lng: number,
    steps: NavStep[],
  ) => {
    const dist = distM >= 1000 ? (distM / 1000).toFixed(1) + ' km' : Math.round(distM) + ' m';
    const mins = Math.round(timeS / 60);
    const time = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins} min`;
    setActiveRoute({ plotId, plotName, distance: dist, duration: time, destLat: lat, destLng: lng, steps });
  }, []);

  const startRoute = useCallback((id: number) => {
    const loc = liveLocation ?? geo.location;
    if (!loc) {
      geo.request();
      showBanner('Requesting your location… try again in a moment.');
      return;
    }
    setActiveRouteId(id);
  }, [liveLocation, geo, showBanner]);

  const clearRoute = useCallback(() => {
    setActiveRouteId(null);
    setActiveRoute(null);
  }, []);

  // Live GPS position streamed from MapView watchPosition
  const handlePositionUpdate = useCallback((lat: number, lng: number) => {
    setLiveLocation({ lat, lng });
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header onAddPlot={addPlot} onPickSuggestion={handlePickSuggestion} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <MapView
          plots={plots}
          userLocation={liveLocation ?? geo.location}
          activeRouteId={activeRouteId}
          onRouteFound={handleRouteFound}
          onRouteRequest={startRoute}
          onPositionUpdate={handlePositionUpdate}
        />

        {banner && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            background: '#D85A30', color: 'white', borderRadius: 8, padding: '8px 18px',
            fontSize: 13, zIndex: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap', animation: 'fadeIn 0.3s ease',
          }}>
            ⚠ {banner}
          </div>
        )}

        {activeRoute && (
          <NavigationPanel
            plotName={activeRoute.plotName}
            totalDist={activeRoute.distance}
            totalTime={activeRoute.duration}
            steps={activeRoute.steps}
            userLocation={liveLocation ?? geo.location}
            destLat={activeRoute.destLat}
            destLng={activeRoute.destLng}
            onClear={clearRoute}
          />
        )}

        <Sidebar
          plots={plots}
          activeRouteId={activeRouteId}
          onRouteRequest={startRoute}
          onZoom={() => {}}
          onRemove={removePlot}
          onFitAll={() => {}}
          onClearAll={clearAll}
        />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateX(-50%) translateY(-6px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes popUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
