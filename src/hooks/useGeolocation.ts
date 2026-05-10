import { useState, useCallback, useRef } from 'react';

interface GeoState {
  location: { lat: number; lng: number } | null;
  error:    string | null;
  loading:  boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    location: null,
    error:    null,
    loading:  false,
  });
  const watchIdRef = useRef<number | null>(null);

  const request = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    // Check permission status first if the API is available
    if ('permissions' in navigator) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') {
          setState(s => ({
            ...s,
            error: 'Location access denied. Please enable it in your browser or phone settings.',
            loading: false,
          }));
          return;
        }
      } catch {
        // permissions API not available — proceed anyway
      }
    }

    setState(s => ({ ...s, loading: true, error: null }));

    // Clear any existing watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // Use watchPosition so it keeps updating as user moves
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error:    null,
          loading:  false,
        });
      },
      (err) => {
        let msg = 'Could not get your location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location access denied. Open your phone Settings → Apps → Chrome → Permissions → Location → Allow.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'Location unavailable. Make sure GPS is turned on.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Move to an open area and try again.';
            break;
        }
        setState(s => ({ ...s, error: msg, loading: false }));
      },
      {
        enableHighAccuracy: true,
        timeout:            15000,
        maximumAge:         0,
      },
    );
  }, []);

  return { ...state, request };
}