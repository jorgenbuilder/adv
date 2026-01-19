'use client';

import type { Waypoint } from '@/types';

/**
 * Waypoint marker component for route planning
 * TODO: Implement draggable marker with delete functionality
 */

interface WaypointMarkerProps {
  waypoint: Waypoint;
  index: number;
  onDragEnd?: (id: string, position: { lat: number; lng: number }) => void;
  onDelete?: (id: string) => void;
}

export function WaypointMarker({
  waypoint,
  index,
}: WaypointMarkerProps) {
  // Placeholder - will be implemented with MapLibre markers
  return (
    <div data-waypoint-id={waypoint.id} data-index={index}>
      {/* Marker will be rendered by MapLibre */}
    </div>
  );
}
