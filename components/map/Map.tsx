'use client';

import { useCallback, useRef, useState } from 'react';
import MapGL, {
  NavigationControl,
  ScaleControl,
  GeolocateControl,
  MapRef,
  ViewStateChangeEvent,
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapState } from '@/lib/store';
import { MAPTILER_KEY } from '@/lib/constants';

// MapTiler satellite style URL with API key
const SATELLITE_STYLE = `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`;

/**
 * Main map component using MapLibre GL JS with react-map-gl
 *
 * Features:
 * - Satellite imagery from MapTiler
 * - 3D terrain with setTerrain() API
 * - Navigation controls
 * - Geolocation
 * - Scale bar
 */
export function Map() {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const { center, zoom, pitch, bearing, setView } = useMapState();

  // Handle view state changes (pan, zoom, etc.)
  const handleMove = useCallback(
    (evt: ViewStateChangeEvent) => {
      setView({
        center: { lat: evt.viewState.latitude, lng: evt.viewState.longitude },
        zoom: evt.viewState.zoom,
        pitch: evt.viewState.pitch ?? 0,
        bearing: evt.viewState.bearing ?? 0,
      });
    },
    [setView]
  );

  // Set up 3D terrain when map loads
  const handleLoad = useCallback(() => {
    setMapLoaded(true);

    const map = mapRef.current?.getMap();
    if (!map) return;

    // Add terrain source
    if (!map.getSource('terrain')) {
      map.addSource('terrain', {
        type: 'raster-dem',
        url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
        tileSize: 256,
      });
    }

    // Enable 3D terrain
    map.setTerrain({
      source: 'terrain',
      exaggeration: 1.2,
    });

    // Set sky for better 3D visualization
    map.setSky({
      'sky-color': '#87CEEB',
      'horizon-color': '#ffffff',
      'fog-color': '#ffffff',
      'fog-ground-blend': 0.5,
    });
  }, []);

  // Check if MapTiler key is configured
  if (!MAPTILER_KEY) {
    return (
      <div className="h-full w-full bg-slate-800 flex items-center justify-center text-slate-400">
        <div className="text-center p-4">
          <p className="font-medium mb-2">MapTiler API Key Required</p>
          <p className="text-sm">
            Add NEXT_PUBLIC_MAPTILER_KEY to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <MapGL
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={SATELLITE_STYLE}
        latitude={center.lat}
        longitude={center.lng}
        zoom={zoom}
        pitch={pitch}
        bearing={bearing}
        onMove={handleMove}
        onLoad={handleLoad}
        maxPitch={85}
        minZoom={5}
        maxZoom={18}
        attributionControl={{ compact: false }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Navigation controls (zoom, compass) */}
        <NavigationControl position="top-right" visualizePitch={true} />

        {/* Geolocation control */}
        <GeolocateControl
          position="top-right"
          trackUserLocation={true}
        />

        {/* Scale bar */}
        <ScaleControl position="bottom-right" maxWidth={100} unit="metric" />
      </MapGL>

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
          <div className="text-white">Loading map...</div>
        </div>
      )}
    </div>
  );
}
