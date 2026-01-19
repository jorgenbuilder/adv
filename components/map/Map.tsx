'use client';

import { useCallback, useRef, useState } from 'react';
import MapGL, {
  NavigationControl,
  ScaleControl,
  GeolocateControl,
  Marker,
  MapRef,
  ViewStateChangeEvent,
  MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapState, useRouteState } from '@/lib/store';
import { MAPTILER_KEY } from '@/lib/constants';
import type { Waypoint } from '@/types';

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
 * - Click to add waypoints
 */
export function Map() {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedWaypoint, setSelectedWaypoint] = useState<string | null>(null);

  const { center, zoom, pitch, bearing, setView } = useMapState();
  const { waypoints, addWaypoint, removeWaypoint, updateWaypoint } =
    useRouteState();

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

  // Handle map click to add waypoint
  const handleClick = useCallback(
    (evt: MapLayerMouseEvent) => {
      // Don't add waypoint if clicking on a marker
      if (selectedWaypoint) {
        setSelectedWaypoint(null);
        return;
      }

      const { lng, lat } = evt.lngLat;
      addWaypoint({ lat, lng });
    },
    [addWaypoint, selectedWaypoint]
  );

  // Handle marker drag end
  const handleMarkerDragEnd = useCallback(
    (waypointId: string, lng: number, lat: number) => {
      updateWaypoint(waypointId, { lat, lng });
    },
    [updateWaypoint]
  );

  // Handle marker click (select/delete)
  const handleMarkerClick = useCallback(
    (waypointId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedWaypoint === waypointId) {
        // Double-click deletes
        removeWaypoint(waypointId);
        setSelectedWaypoint(null);
      } else {
        setSelectedWaypoint(waypointId);
      }
    },
    [selectedWaypoint, removeWaypoint]
  );

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
        onClick={handleClick}
        maxPitch={85}
        minZoom={5}
        maxZoom={18}
        attributionControl={{ compact: false }}
        style={{ width: '100%', height: '100%' }}
        cursor={mapLoaded ? 'crosshair' : 'wait'}
      >
        {/* Navigation controls (zoom, compass) */}
        <NavigationControl position="top-right" visualizePitch={true} />

        {/* Geolocation control */}
        <GeolocateControl position="top-right" trackUserLocation={true} />

        {/* Scale bar */}
        <ScaleControl position="bottom-right" maxWidth={100} unit="metric" />

        {/* Waypoint markers */}
        {waypoints.map((waypoint, index) => (
          <WaypointMarkerComponent
            key={waypoint.id}
            waypoint={waypoint}
            index={index}
            isSelected={selectedWaypoint === waypoint.id}
            onClick={handleMarkerClick}
            onDragEnd={handleMarkerDragEnd}
          />
        ))}
      </MapGL>

      {/* Loading indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
          <div className="text-white">Loading map...</div>
        </div>
      )}

      {/* Instructions overlay */}
      {mapLoaded && waypoints.length === 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg text-sm">
          Click on the map to add waypoints
        </div>
      )}
    </div>
  );
}

/**
 * Waypoint marker component
 */
interface WaypointMarkerProps {
  waypoint: Waypoint;
  index: number;
  isSelected: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDragEnd: (id: string, lng: number, lat: number) => void;
}

function WaypointMarkerComponent({
  waypoint,
  index,
  isSelected,
  onClick,
  onDragEnd,
}: WaypointMarkerProps) {
  const position = waypoint.snappedPosition || waypoint.position;

  return (
    <Marker
      longitude={position.lng}
      latitude={position.lat}
      anchor="bottom"
      draggable={true}
      onDragEnd={(e) => onDragEnd(waypoint.id, e.lngLat.lng, e.lngLat.lat)}
    >
      <div
        onClick={(e) => onClick(waypoint.id, e)}
        className={`
          cursor-pointer select-none transition-transform
          ${isSelected ? 'scale-125' : 'hover:scale-110'}
        `}
      >
        {/* Marker pin */}
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center
            font-bold text-white text-sm shadow-lg
            ${isSelected ? 'bg-red-500 ring-2 ring-white' : 'bg-blue-500'}
          `}
        >
          {index + 1}
        </div>
        {/* Pin tail */}
        <div
          className={`
            w-0 h-0 mx-auto -mt-1
            border-l-[8px] border-l-transparent
            border-r-[8px] border-r-transparent
            border-t-[12px]
            ${isSelected ? 'border-t-red-500' : 'border-t-blue-500'}
          `}
        />
        {/* Delete hint when selected */}
        {isSelected && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-background px-2 py-1 rounded text-xs shadow">
            Click again to delete
          </div>
        )}
      </div>
    </Marker>
  );
}
