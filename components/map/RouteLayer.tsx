'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useRouteState } from '@/lib/store';
import { calculateRoute } from '@/lib/router';
import type { LatLng } from '@/types';

// Layer IDs for the route
const ROUTE_SOURCE = 'route';
const ROUTE_LAYER = 'route-line';
const ROUTE_CASING_LAYER = 'route-casing';

/**
 * Route layer for displaying the planned route between waypoints.
 * Uses Dijkstra's algorithm for pathfinding on the road network.
 */
export function RouteLayer() {
  const { current: map } = useMap();
  const { waypoints, setCalculatedRoute } = useRouteState();
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const sourceAddedRef = useRef(false);

  // Add source and layers when map is ready
  const setupLayers = useCallback(() => {
    if (!map) return;

    const maplibre = map.getMap();

    // Check if source already exists
    if (maplibre.getSource(ROUTE_SOURCE)) {
      sourceAddedRef.current = true;
      return;
    }

    // Add GeoJSON source for the route
    maplibre.addSource(ROUTE_SOURCE, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      },
    });

    // Add casing layer (outline)
    maplibre.addLayer({
      id: ROUTE_CASING_LAYER,
      type: 'line',
      source: ROUTE_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#1e40af', // Dark blue
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 4,
          10, 6,
          14, 8,
          18, 12,
        ],
        'line-opacity': 0.8,
      },
    });

    // Add main route line
    maplibre.addLayer({
      id: ROUTE_LAYER,
      type: 'line',
      source: ROUTE_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#3b82f6', // Blue
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          5, 2,
          10, 4,
          14, 6,
          18, 8,
        ],
        'line-opacity': 0.9,
      },
    });

    sourceAddedRef.current = true;
  }, [map]);

  // Set up layers when map style loads
  useEffect(() => {
    if (!map) return;

    const maplibre = map.getMap();

    const onStyleLoad = () => {
      setupLayers();
    };

    if (maplibre.isStyleLoaded()) {
      setupLayers();
    } else {
      maplibre.on('style.load', onStyleLoad);
    }

    return () => {
      maplibre.off('style.load', onStyleLoad);
    };
  }, [map, setupLayers]);

  // Calculate route when waypoints change
  useEffect(() => {
    let cancelled = false;

    const updateRoute = async () => {
      if (waypoints.length < 2) {
        setRoutePath([]);
        setCalculatedRoute(null);
        return;
      }

      // Extract positions from waypoints (prefer snapped positions)
      const positions = waypoints.map(
        (wp) => wp.snappedPosition || wp.position
      );

      // Calculate the route
      const result = await calculateRoute(positions);

      if (cancelled) return;

      if (result) {
        setRoutePath(result.path);
        setCalculatedRoute({
          waypoints,
          path: result.path,
          distance: result.distance,
        });
      } else {
        // Fallback to straight lines between waypoints
        setRoutePath(positions);
        setCalculatedRoute({
          waypoints,
          path: positions,
          distance: 0,
        });
      }
    };

    updateRoute();

    return () => {
      cancelled = true;
    };
  }, [waypoints, setCalculatedRoute]);

  // Update the map source when route changes
  useEffect(() => {
    if (!map || !sourceAddedRef.current) return;

    const maplibre = map.getMap();
    const source = maplibre.getSource(ROUTE_SOURCE);

    if (!source || source.type !== 'geojson') return;

    // Convert path to GeoJSON coordinates
    const coordinates = routePath.map((p) => [p.lng, p.lat]);

    // Update source data
    (source as maplibregl.GeoJSONSource).setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  }, [map, routePath]);

  // This component doesn't render anything directly - it manages MapLibre layers
  return null;
}
