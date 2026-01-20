'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useRouteState } from '@/lib/store';
import { calculateRoute, haversineDistance } from '@/lib/router';
import type { LatLng } from '@/types';

// Layer IDs for the route
const ROUTE_SOURCE = 'route';
const ROUTE_LAYER = 'route-line';
const ROUTE_CASING_LAYER = 'route-casing';
const ROUTE_HIT_LAYER = 'route-hit-area';

/**
 * Segment info for tracking which part of the route belongs to which waypoint pair
 */
interface RouteSegment {
  startWaypointIndex: number;
  startPathIndex: number;
  endPathIndex: number;
}

/**
 * Route layer for displaying the planned route between waypoints.
 * Uses Dijkstra's algorithm for pathfinding on the road network.
 * Supports clicking on the route to add anchor points.
 */
export function RouteLayer() {
  const { current: map } = useMap();
  const { waypoints, insertWaypoint, setCalculatedRoute } = useRouteState();
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const segmentsRef = useRef<RouteSegment[]>([]);
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

    // Add invisible hit area for easier clicking
    maplibre.addLayer({
      id: ROUTE_HIT_LAYER,
      type: 'line',
      source: ROUTE_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': 'transparent',
        'line-width': 20, // Wide hit area
        'line-opacity': 0,
      },
    });

    sourceAddedRef.current = true;
  }, [map]);

  // Handle click on route line
  const handleRouteClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (waypoints.length < 2 || routePath.length < 2) return;

      const clickedPoint: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };

      // Find the closest point on the route and which segment it belongs to
      let closestDistance = Infinity;
      let closestPoint: LatLng | null = null;
      let closestSegmentIndex = 0;

      // Check each segment of the path
      for (let i = 0; i < routePath.length - 1; i++) {
        const p1 = routePath[i];
        const p2 = routePath[i + 1];

        // Find closest point on this line segment
        const closest = closestPointOnSegment(clickedPoint, p1, p2);
        const distance = haversineDistance(clickedPoint, closest);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestPoint = closest;

          // Find which waypoint segment this path index belongs to
          for (let j = 0; j < segmentsRef.current.length; j++) {
            const seg = segmentsRef.current[j];
            if (i >= seg.startPathIndex && i < seg.endPathIndex) {
              closestSegmentIndex = seg.startWaypointIndex;
              break;
            }
          }
        }
      }

      if (closestPoint && closestDistance < 100) {
        // Within 100m of route line
        // Insert anchor point after the segment's start waypoint
        insertWaypoint(closestPoint, closestSegmentIndex, 'anchor');
      }
    },
    [waypoints, routePath, insertWaypoint]
  );

  // Set up layers and event listeners when map style loads
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

  // Set up click handlers
  useEffect(() => {
    if (!map || !sourceAddedRef.current) return;

    const maplibre = map.getMap();

    // Change cursor on hover
    const onMouseEnter = () => {
      maplibre.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      maplibre.getCanvas().style.cursor = 'crosshair';
    };

    maplibre.on('mouseenter', ROUTE_HIT_LAYER, onMouseEnter);
    maplibre.on('mouseleave', ROUTE_HIT_LAYER, onMouseLeave);
    maplibre.on('click', ROUTE_HIT_LAYER, handleRouteClick);

    return () => {
      maplibre.off('mouseenter', ROUTE_HIT_LAYER, onMouseEnter);
      maplibre.off('mouseleave', ROUTE_HIT_LAYER, onMouseLeave);
      maplibre.off('click', ROUTE_HIT_LAYER, handleRouteClick);
    };
  }, [map, handleRouteClick]);

  // Calculate route when waypoints change
  useEffect(() => {
    let cancelled = false;

    const updateRoute = async () => {
      if (waypoints.length < 2) {
        setRoutePath([]);
        segmentsRef.current = [];
        setCalculatedRoute(null);
        return;
      }

      // Extract positions from waypoints (prefer snapped positions)
      const positions = waypoints.map(
        (wp) => wp.snappedPosition || wp.position
      );

      // Calculate the full route at once to get leg data
      const routeResult = await calculateRoute(positions);

      if (cancelled) return;

      if (routeResult && routeResult.path.length > 0) {
        // Build segment index from legs
        const segments: RouteSegment[] = [];
        let pathIndex = 0;

        for (let i = 0; i < positions.length - 1; i++) {
          const segmentStart = pathIndex;
          // Each leg corresponds to one pair of waypoints
          // Estimate segment end based on path proportions
          const segmentEnd = Math.min(
            routeResult.path.length - 1,
            i === positions.length - 2
              ? routeResult.path.length - 1
              : Math.floor(((i + 1) / (positions.length - 1)) * routeResult.path.length)
          );

          segments.push({
            startWaypointIndex: i,
            startPathIndex: segmentStart,
            endPathIndex: segmentEnd,
          });

          pathIndex = segmentEnd;
        }

        setRoutePath(routeResult.path);
        segmentsRef.current = segments;
        setCalculatedRoute({
          waypoints,
          path: routeResult.path,
          distance: routeResult.distance,
          legs: routeResult.legs,
          distanceByRoadClass: routeResult.distanceByRoadClass,
          travelTime: routeResult.travelTime,
          travelTimeByRoadClass: routeResult.travelTimeByRoadClass,
        });
      } else {
        // Fallback: straight line path
        const fullPath: LatLng[] = [];
        const segments: RouteSegment[] = [];
        let totalDistance = 0;

        for (let i = 0; i < positions.length; i++) {
          const segmentStart = fullPath.length;
          fullPath.push(positions[i]);

          if (i > 0) {
            totalDistance += haversineDistance(positions[i - 1], positions[i]);
            segments.push({
              startWaypointIndex: i - 1,
              startPathIndex: segmentStart - 1,
              endPathIndex: segmentStart,
            });
          }
        }

        setRoutePath(fullPath);
        segmentsRef.current = segments;
        setCalculatedRoute({
          waypoints,
          path: fullPath,
          distance: totalDistance,
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

/**
 * Find the closest point on a line segment to a given point
 */
function closestPointOnSegment(point: LatLng, p1: LatLng, p2: LatLng): LatLng {
  const dx = p2.lng - p1.lng;
  const dy = p2.lat - p1.lat;

  if (dx === 0 && dy === 0) {
    // p1 and p2 are the same point
    return p1;
  }

  // Calculate the parameter t for the closest point on the infinite line
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - p1.lng) * dx + (point.lat - p1.lat) * dy) / (dx * dx + dy * dy)
    )
  );

  // Return the closest point on the segment
  return {
    lng: p1.lng + t * dx,
    lat: p1.lat + t * dy,
  };
}
