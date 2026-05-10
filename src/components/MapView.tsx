'use client';
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { Plot, NavStep } from '@/types';
import 'leaflet/dist/leaflet.css';
import type L from 'leaflet';

interface Props {
  plots: Plot[];
  userLocation: { lat: number; lng: number } | null;
  activeRouteId: number | null;
  onRouteFound: (
    plotId: number,
    plotName: string,
    distM: number,
    timeS: number,
    lat: number,
    lng: number,
    steps: NavStep[],
  ) => void;
  onRouteRequest: (id: number) => void;
  onPositionUpdate: (lat: number, lng: number) => void;
}

export interface MapViewHandle {
  fitAll: () => void;
}

declare global { interface Window { _routeTo: (id: number) => void; _L: typeof L } }

const MapView = forwardRef<MapViewHandle, Props>(function MapView(
  { plots, userLocation, activeRouteId, onRouteFound, onRouteRequest, onPositionUpdate },
  ref,
) {
  const mapRef        = useRef<L.Map | null>(null);
  const markerRefs    = useRef<Map<number, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const watchIdRef    = useRef<number | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);

  const onRouteRequestRef  = useRef(onRouteRequest);
  const onRouteFoundRef    = useRef(onRouteFound);
  const onPositionRef      = useRef(onPositionUpdate);
  useEffect(() => { onRouteRequestRef.current  = onRouteRequest;  }, [onRouteRequest]);
  useEffect(() => { onRouteFoundRef.current    = onRouteFound;    }, [onRouteFound]);
  useEffect(() => { onPositionRef.current      = onPositionUpdate;}, [onPositionUpdate]);

  useEffect(() => {
    window._routeTo = (id) => onRouteRequestRef.current(id);
  }, []);

  // Expose fitAll to parent via ref
  useImperativeHandle(ref, () => ({
    fitAll() {
      const map = mapRef.current;
      if (!map) return;

      const points: [number, number][] = [];

      // Include all plot markers
      for (const plot of plots) {
        points.push([plot.lat, plot.lng]);
      }

      // Include user location if available
      if (userLocation) {
        points.push([userLocation.lat, userLocation.lng]);
      }

      if (points.length === 0) return;

      if (points.length === 1) {
        map.setView(points[0], 14, { animate: true });
        return;
      }

      const L = window._L;
      if (!L) return;

      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    },
  }), [plots, userLocation]);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    (async () => {
      const L = await import('leaflet');
      const container = containerRef.current!;
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) {
        mapRef.current?.remove();
        mapRef.current = null;
      }
      if (mapRef.current) return;

      // @ts-expect-error internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(container, { zoomControl: true }).setView([-24.65, 25.9], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      window._L = L;
    })();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── User location dot ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    (async () => {
      const L  = await import('leaflet');
      const map = mapRef.current!;
      userMarkerRef.current?.remove();
      userMarkerRef.current = L.circleMarker(
        [userLocation.lat, userLocation.lng],
        { radius: 9, fillColor: '#378ADD', color: 'white', weight: 3, fillOpacity: 1 },
      ).addTo(map).bindPopup('<b>📍 You are here</b>');
      if (markerRefs.current.size === 0) {
        map.setView([userLocation.lat, userLocation.lng], 13, { animate: true });
      }
    })();
  }, [userLocation]);

  // ── Plot markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    (async () => {
      const L   = await import('leaflet');
      const map = mapRef.current!;
      const existing = new Set(markerRefs.current.keys());
      for (const plot of plots) {
        if (!markerRefs.current.has(plot.id)) {
          const marker = L.marker([plot.lat, plot.lng], { icon: makeIcon(L, plot.color) })
            .addTo(map).bindPopup(buildPopup(plot));
          markerRefs.current.set(plot.id, marker);
          map.setView([plot.lat, plot.lng], 14, { animate: true });
        }
        existing.delete(plot.id);
      }
      for (const id of existing) {
        markerRefs.current.get(id)?.remove();
        markerRefs.current.delete(id);
      }
    })();
  }, [plots]);

  // ── GPS watch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeRouteId === null) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onPositionRef.current(lat, lng);
        if (mapRef.current && userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        }
      },
      (err) => console.warn('GPS watch error:', err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 },
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeRouteId]);

  // ── Fetch route + draw polyline ───────────────────────────────────────────
  useEffect(() => {
    const clearLayer = () => {
      routeLayerRef.current?.remove();
      routeLayerRef.current = null;
    };

    if (!mapRef.current || activeRouteId === null || !userLocation) {
      clearLayer(); return;
    }
    const plot = plots.find(p => p.id === activeRouteId);
    if (!plot) { clearLayer(); return; }

    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !mapRef.current) return;
      clearLayer();

      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${userLocation.lng},${userLocation.lat};${plot.lng},${plot.lat}` +
        `?overview=full&geometries=geojson&steps=true&annotations=false`;

      let data: OsrmResponse;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      } catch (err) {
        if (!cancelled) console.warn('OSRM fetch failed:', err);
        return;
      }
      if (cancelled || !mapRef.current) return;
      if (data.code !== 'Ok' || !data.routes?.length) {
        console.warn('OSRM no route:', data.code); return;
      }

      const route   = data.routes[0];
      const coords  = route.geometry.coordinates as [number, number][];
      const latLngs = coords.map(([lng, lat]) => L.latLng(lat, lng));

      routeLayerRef.current = L.polyline(latLngs, {
        color: '#378ADD', weight: 6, opacity: 0.9,
      }).addTo(mapRef.current);
      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [48, 48] });

      const steps: NavStep[] = [];
      for (const leg of route.legs) {
        for (const s of leg.steps) {
          const maneuver = s.maneuver;
          steps.push({
            instruction:  buildInstruction(maneuver.type, maneuver.modifier, s.name),
            distance:     s.distance,
            duration:     s.duration,
            maneuverType: maneuver.type,
            modifier:     maneuver.modifier ?? '',
            lat:          maneuver.location[1],
            lng:          maneuver.location[0],
          });
        }
      }

      onRouteFoundRef.current(
        plot.id, plot.name,
        route.distance, route.duration,
        plot.lat, plot.lng,
        steps,
      );
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRouteId, userLocation]);

  return (
    <div ref={containerRef} style={{ flex: 1, height: '100%', zIndex: 1, minHeight: 0 }} />
  );
});

export default MapView;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildInstruction(type: string, modifier?: string, name?: string): string {
  const road = name && name !== '' ? ` onto ${name}` : '';
  switch (type) {
    case 'depart':       return `Head ${modifier ?? 'forward'}${road}`;
    case 'arrive':       return 'You have arrived at your destination';
    case 'turn': {
      const dir = modifier === 'straight' ? 'straight ahead' : modifier ?? 'turn';
      return `Turn ${dir}${road}`;
    }
    case 'new name':     return `Continue${road}`;
    case 'continue':     return `Continue ${modifier ?? 'straight'}${road}`;
    case 'merge':        return `Merge ${modifier ?? ''}${road}`;
    case 'on ramp':      return `Take the ramp${road}`;
    case 'off ramp':     return `Take the exit${road}`;
    case 'fork':         return `Keep ${modifier ?? 'straight'} at the fork${road}`;
    case 'end of road':  return `Turn ${modifier ?? 'right'} at the end of the road${road}`;
    case 'roundabout':   return `Enter the roundabout${road}`;
    case 'rotary':       return `Enter the rotary${road}`;
    case 'roundabout turn': return `At the roundabout, turn ${modifier ?? 'right'}${road}`;
    case 'notification': return `Continue${road}`;
    default:             return `Continue${road}`;
  }
}

function makeIcon(L: typeof import('leaflet'), color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
    <filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/></filter>
    <path filter="url(#sh)" d="M15 1C7.82 1 2 6.82 2 14c0 9.5 13 23 13 23S28 23.5 28 14C28 6.82 22.18 1 15 1z" fill="${color}"/>
    <circle cx="15" cy="14" r="5.5" fill="white" opacity="0.93"/>
  </svg>`;
  return L.divIcon({ html: svg, iconSize: [30, 38], iconAnchor: [15, 38], popupAnchor: [0, -40], className: '' });
}

function buildPopup(plot: Plot) {
  return `
    <div style="height:4px;background:${plot.color};border-radius:4px 4px 0 0"></div>
    <div style="padding:12px 16px;min-width:180px">
      <div style="font-weight:600;font-size:14px;margin-bottom:3px">${plot.name}</div>
      <div style="font-family:monospace;font-size:11px;color:#6b6b64;margin-bottom:10px">
        ${plot.lat.toFixed(6)}, ${plot.lng.toFixed(6)}
      </div>
      <button onclick="window._routeTo(${plot.id})"
        style="background:#378ADD;color:white;border:none;border-radius:6px;
               padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;width:100%">
        🧭 Get directions
      </button>
    </div>`;
}

interface OsrmResponse {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs: Array<{
      steps: Array<{
        distance: number;
        duration: number;
        name: string;
        maneuver: {
          type: string;
          modifier?: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
}