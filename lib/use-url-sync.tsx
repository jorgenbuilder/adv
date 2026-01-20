'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from './store';
import { parseStateFromURL, updateURL } from './url-state';

// Debounce delay for URL updates (ms)
const DEBOUNCE_DELAY = 500;

/**
 * Hook to sync app state with URL
 *
 * - On mount: restore state from URL
 * - On state change: update URL (debounced)
 */
export function useURLSync() {
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  // Get state from store
  const waypoints = useAppStore((s) => s.waypoints);
  const center = useAppStore((s) => s.center);
  const zoom = useAppStore((s) => s.zoom);
  const pitch = useAppStore((s) => s.pitch);
  const bearing = useAppStore((s) => s.bearing);
  const roadFilters = useAppStore((s) => s.roadFilters);
  const roadPreferences = useAppStore((s) => s.roadPreferences);

  // Get actions from store
  const addWaypoint = useAppStore((s) => s.addWaypoint);
  const setView = useAppStore((s) => s.setView);
  const setRoadFilters = useAppStore((s) => s.setRoadFilters);
  const setRoadPreferences = useAppStore((s) => s.setRoadPreferences);

  // Restore state from URL on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const urlState = parseStateFromURL();

    // Restore waypoints
    if (urlState.waypoints.length > 0) {
      urlState.waypoints.forEach((position) => {
        addWaypoint(position);
      });
    }

    // Restore map view
    const viewUpdate: Parameters<typeof setView>[0] = {};

    if (urlState.center) {
      viewUpdate.center = urlState.center;
    }
    if (urlState.zoom !== null) {
      viewUpdate.zoom = urlState.zoom;
    }
    if (urlState.pitch !== null) {
      viewUpdate.pitch = urlState.pitch;
    }
    if (urlState.bearing !== null) {
      viewUpdate.bearing = urlState.bearing;
    }

    if (Object.keys(viewUpdate).length > 0) {
      setView(viewUpdate);
    }

    // Restore filters
    if (urlState.filters) {
      setRoadFilters(urlState.filters);
    }

    // Restore preferences
    if (urlState.preferences) {
      setRoadPreferences(urlState.preferences);
    }
  }, [addWaypoint, setView, setRoadFilters, setRoadPreferences]);

  // Update URL when state changes (debounced)
  useEffect(() => {
    // Skip if not initialized yet
    if (!isInitialized.current) return;

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      const waypointPositions = waypoints.map(
        (wp) => wp.snappedPosition || wp.position
      );

      updateURL({
        waypoints: waypointPositions,
        center,
        zoom,
        pitch,
        bearing,
        filters: roadFilters,
        preferences: roadPreferences,
      });
    }, DEBOUNCE_DELAY);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [waypoints, center, zoom, pitch, bearing, roadFilters, roadPreferences]);
}

/**
 * Provider component that initializes URL sync
 */
export function URLSyncProvider({ children }: { children: React.ReactNode }) {
  useURLSync();
  return <>{children}</>;
}
