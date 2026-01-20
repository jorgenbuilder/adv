'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { useRouteState, usePreferenceState } from '@/lib/store';
import { calculateRoute, haversineDistance } from '@/lib/router';
import type { LatLng } from '@/types';

// Layer IDs for the route
const ROUTE_SOURCE = 'route';
const ROUTE_LAYER = 'route-line';
const ROUTE_CASING_LAYER = 'route-casing';
const ROUTE_HIT_LAYER = 'route-hit-area';

// Layer IDs for the drag preview
const DRAG_PREVIEW_SOURCE = 'drag-preview';
const DRAG_PREVIEW_LAYER = 'drag-preview-line';
const DRAG_ANCHOR_SOURCE = 'drag-anchor';
const DRAG_ANCHOR_LAYER = 'drag-anchor-point';

/**
 * Segment info for tracking which part of the route belongs to which waypoint pair
 */
interface RouteSegment {
  startWaypointIndex: number;
  startPathIndex: number;
  endPathIndex: number;
}

/**
 * State for dragging to create an anchor
 */
interface DragState {
  isDragging: boolean;
  segmentIndex: number;
  startPosition: LatLng | null;
  currentPosition: LatLng | null;
}

/**
 * Route layer for displaying the planned route between waypoints.
 * Uses Dijkstra's algorithm for pathfinding on the road network.
 * Supports dragging on the route to create and position anchor points.
 */
export function RouteLayer() {
  const { current: map } = useMap();
  const { waypoints, insertWaypoint, setCalculatedRoute } = useRouteState();
  const { roadPreferences } = usePreferenceState();
  const [routePath, setRoutePath] = useState<LatLng[]>([]);
  const segmentsRef = useRef<RouteSegment[]>([]);
  const sourceAddedRef = useRef(false);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    segmentIndex: 0,
    startPosition: null,
    currentPosition: null,
  });

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

    // Add drag preview source and layer
    maplibre.addSource(DRAG_PREVIEW_SOURCE, {
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

    maplibre.addLayer({
      id: DRAG_PREVIEW_LAYER,
      type: 'line',
      source: DRAG_PREVIEW_SOURCE,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#f97316', // Orange for preview
        'line-width': 3,
        'line-dasharray': [2, 2],
        'line-opacity': 0.8,
      },
    });

    // Add drag anchor preview source and layer
    maplibre.addSource(DRAG_ANCHOR_SOURCE, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
      },
    });

    maplibre.addLayer({
      id: DRAG_ANCHOR_LAYER,
      type: 'circle',
      source: DRAG_ANCHOR_SOURCE,
      paint: {
        'circle-radius': 8,
        'circle-color': '#ffffff',
        'circle-stroke-color': '#1e293b',
        'circle-stroke-width': 3,
        'circle-opacity': 0.9,
      },
    });

    sourceAddedRef.current = true;
  }, [map]);

  /**
   * Find the closest point on route and which segment it belongs to
   */
  const findClosestRoutePoint = useCallback(
    (clickedPoint: LatLng): { point: LatLng; segmentIndex: number; distance: number } | null => {
      if (routePath.length < 2) return null;

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

      if (!closestPoint) return null;
      return { point: closestPoint, segmentIndex: closestSegmentIndex, distance: closestDistance };
    },
    [routePath]
  );

  /**
   * Update the drag preview visualization
   */
  const updateDragPreview = useCallback(
    (position: LatLng | null, segmentIndex: number) => {
      if (!map || !sourceAddedRef.current) return;

      const maplibre = map.getMap();
      const previewSource = maplibre.getSource(DRAG_PREVIEW_SOURCE) as maplibregl.GeoJSONSource;
      const anchorSource = maplibre.getSource(DRAG_ANCHOR_SOURCE) as maplibregl.GeoJSONSource;

      if (!previewSource || !anchorSource) return;

      if (!position) {
        // Clear preview
        previewSource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] },
        });
        anchorSource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [0, 0] },
        });
        return;
      }

      // Get waypoint positions for this segment
      const startWaypoint = waypoints[segmentIndex];
      const endWaypoint = waypoints[segmentIndex + 1];

      if (!startWaypoint || !endWaypoint) return;

      const startPos = startWaypoint.snappedPosition || startWaypoint.position;
      const endPos = endWaypoint.snappedPosition || endWaypoint.position;

      // Draw preview lines from start waypoint -> drag point -> end waypoint
      previewSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [startPos.lng, startPos.lat],
            [position.lng, position.lat],
            [endPos.lng, endPos.lat],
          ],
        },
      });

      // Show anchor preview at current position
      anchorSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [position.lng, position.lat],
        },
      });
    },
    [map, waypoints]
  );

  // Handle mousedown on route line - start drag to create anchor
  const handleRouteMouseDown = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (waypoints.length < 2 || routePath.length < 2) return;

      const clickedPoint: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const result = findClosestRoutePoint(clickedPoint);

      if (result && result.distance < 100) {
        // Within 100m of route line - start dragging
        e.preventDefault();

        dragStateRef.current = {
          isDragging: true,
          segmentIndex: result.segmentIndex,
          startPosition: result.point,
          currentPosition: clickedPoint,
        };

        // Show initial preview
        updateDragPreview(clickedPoint, result.segmentIndex);

        // Disable map drag
        const maplibre = map?.getMap();
        if (maplibre) {
          maplibre.dragPan.disable();
        }
      }
    },
    [waypoints, routePath, findClosestRoutePoint, updateDragPreview, map]
  );

  // Handle mousemove during drag
  const handleMouseMove = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!dragStateRef.current.isDragging) return;

      const position: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      dragStateRef.current.currentPosition = position;

      // Update preview
      updateDragPreview(position, dragStateRef.current.segmentIndex);
    },
    [updateDragPreview]
  );

  // Handle mouseup - finish drag and create anchor
  const handleMouseUp = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!dragStateRef.current.isDragging) return;

      const position: LatLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      const { segmentIndex, startPosition } = dragStateRef.current;

      // Clear drag state
      dragStateRef.current = {
        isDragging: false,
        segmentIndex: 0,
        startPosition: null,
        currentPosition: null,
      };

      // Clear preview
      updateDragPreview(null, 0);

      // Re-enable map drag
      const maplibre = map?.getMap();
      if (maplibre) {
        maplibre.dragPan.enable();
      }

      // Check if user actually dragged (not just clicked)
      // If start and end positions are close, it's a click - don't create anchor
      if (startPosition) {
        const dragDistance = haversineDistance(startPosition, position);
        if (dragDistance < 10) {
          // Less than 10m movement - treat as click, don't create
          return;
        }
      }

      // Insert anchor point after the segment's start waypoint
      insertWaypoint(position, segmentIndex, 'anchor');
    },
    [map, insertWaypoint, updateDragPreview]
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

  // Set up drag handlers for creating anchors
  useEffect(() => {
    if (!map || !sourceAddedRef.current) return;

    const maplibre = map.getMap();

    // Change cursor on hover to indicate draggable
    const onMouseEnter = () => {
      if (!dragStateRef.current.isDragging) {
        maplibre.getCanvas().style.cursor = 'grab';
      }
    };

    const onMouseLeave = () => {
      if (!dragStateRef.current.isDragging) {
        maplibre.getCanvas().style.cursor = 'crosshair';
      }
    };

    // Handle mousedown on route - start drag
    const onMouseDown = (e: maplibregl.MapMouseEvent) => {
      handleRouteMouseDown(e);
      if (dragStateRef.current.isDragging) {
        maplibre.getCanvas().style.cursor = 'grabbing';
      }
    };

    // Handle mousemove anywhere on map during drag
    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      handleMouseMove(e);
    };

    // Handle mouseup anywhere on map - finish drag
    const onMouseUp = (e: maplibregl.MapMouseEvent) => {
      if (dragStateRef.current.isDragging) {
        handleMouseUp(e);
        maplibre.getCanvas().style.cursor = 'crosshair';
      }
    };

    maplibre.on('mouseenter', ROUTE_HIT_LAYER, onMouseEnter);
    maplibre.on('mouseleave', ROUTE_HIT_LAYER, onMouseLeave);
    maplibre.on('mousedown', ROUTE_HIT_LAYER, onMouseDown);
    maplibre.on('mousemove', onMouseMove);
    maplibre.on('mouseup', onMouseUp);

    return () => {
      maplibre.off('mouseenter', ROUTE_HIT_LAYER, onMouseEnter);
      maplibre.off('mouseleave', ROUTE_HIT_LAYER, onMouseLeave);
      maplibre.off('mousedown', ROUTE_HIT_LAYER, onMouseDown);
      maplibre.off('mousemove', onMouseMove);
      maplibre.off('mouseup', onMouseUp);
    };
  }, [map, handleRouteMouseDown, handleMouseMove, handleMouseUp]);

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
      // Pass preferences to bias toward preferred road types
      const routeResult = await calculateRoute(positions, roadPreferences);

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
  }, [waypoints, roadPreferences, setCalculatedRoute]);

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
