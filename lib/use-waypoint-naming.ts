'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from './store';
import { findNearestRoadName } from './router';

/**
 * Hook that automatically names waypoints based on nearby road names.
 * This runs in the background and updates waypoint labels when they don't have one.
 */
export function useWaypointNaming() {
  const waypoints = useAppStore((state) => state.waypoints);
  const setWaypointLabel = useAppStore((state) => state.setWaypointLabel);

  // Track which waypoints we've already tried to name
  const namedWaypointsRef = useRef<Set<string>>(new Set());
  // Track positions we've already named (to avoid re-naming on drag)
  const namedPositionsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    // Find waypoints that need naming (no label and not yet attempted)
    const waypointsToName = waypoints.filter(
      (wp) => !wp.label && !namedWaypointsRef.current.has(wp.id)
    );

    if (waypointsToName.length === 0) return;

    // Name each waypoint asynchronously
    waypointsToName.forEach(async (wp) => {
      // Mark as attempted immediately to avoid duplicate requests
      namedWaypointsRef.current.add(wp.id);

      // Create a position key to check if we've already named this location
      const posKey = `${wp.position.lat.toFixed(5)},${wp.position.lng.toFixed(5)}`;

      // Check if we already have a name for this position
      const cachedName = namedPositionsRef.current.get(posKey);
      if (cachedName) {
        setWaypointLabel(wp.id, cachedName);
        return;
      }

      try {
        const roadName = await findNearestRoadName(wp.position);
        if (roadName) {
          setWaypointLabel(wp.id, roadName);
          namedPositionsRef.current.set(posKey, roadName);
        }
      } catch (error) {
        console.warn('Failed to find road name for waypoint:', error);
      }
    });
  }, [waypoints, setWaypointLabel]);

  // Clean up named waypoints that no longer exist
  useEffect(() => {
    const currentIds = new Set(waypoints.map((wp) => wp.id));
    const namedIds = Array.from(namedWaypointsRef.current);

    namedIds.forEach((id) => {
      if (!currentIds.has(id)) {
        namedWaypointsRef.current.delete(id);
      }
    });
  }, [waypoints]);
}

/**
 * Hook to rename a waypoint when its position changes (e.g., after drag)
 */
export function useRenameOnDrag(waypointId: string, position: { lat: number; lng: number }) {
  const setWaypointLabel = useAppStore((state) => state.setWaypointLabel);
  const prevPositionRef = useRef<string | null>(null);

  useEffect(() => {
    const posKey = `${position.lat.toFixed(5)},${position.lng.toFixed(5)}`;

    // Only rename if position actually changed
    if (prevPositionRef.current === posKey) return;
    if (prevPositionRef.current === null) {
      prevPositionRef.current = posKey;
      return; // Don't rename on initial mount
    }

    prevPositionRef.current = posKey;

    // Find and set new road name
    findNearestRoadName(position).then((roadName) => {
      if (roadName) {
        setWaypointLabel(waypointId, roadName);
      }
    }).catch((error) => {
      console.warn('Failed to rename waypoint after drag:', error);
    });
  }, [waypointId, position, setWaypointLabel]);
}
