'use client';
import { useState, useCallback } from 'react';

interface GeoState {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ location: null, error: null, loading: false });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser.' }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude }, error: null, loading: false });
      },
      (err) => {
        let msg = 'Location access denied.';
        if (err.code === 1) msg = 'Location permission denied. Please allow it in your browser settings.';
        if (err.code === 2) msg = 'Location unavailable. Check your device GPS.';
        if (err.code === 3) msg = 'Location request timed out. Try again.';
        setState({ location: null, error: msg, loading: false });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { ...state, request };
}
