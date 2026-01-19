'use client';

import { useRouteState } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, MapPin } from 'lucide-react';
import type { Waypoint } from '@/types';

/**
 * Waypoint list panel showing ordered list of waypoints
 * with distance calculation and delete/reorder functionality
 */
export function WaypointList() {
  const { waypoints, removeWaypoint, reorderWaypoints, clearRoute, calculatedRoute } =
    useRouteState();

  // Format coordinates for display
  const formatCoords = (waypoint: Waypoint) => {
    const pos = waypoint.snappedPosition || waypoint.position;
    return `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
  };

  // Format distance in km
  const formatDistance = (meters: number) => {
    return (meters / 1000).toFixed(1);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('waypointIndex', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('waypointIndex'), 10);
    if (sourceIndex !== targetIndex) {
      reorderWaypoints(sourceIndex, targetIndex);
    }
  };

  if (waypoints.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <MapPin className="w-5 h-5" />
          <span className="font-medium">Waypoints</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Click on the map to add waypoints and create a route.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <span className="font-medium">Waypoints ({waypoints.length})</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearRoute}
          className="text-muted-foreground hover:text-destructive"
        >
          Clear all
        </Button>
      </div>

      <div className="space-y-2">
        {waypoints.map((waypoint, index) => (
          <Card
            key={waypoint.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            className="cursor-move hover:border-primary/50 transition-colors"
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                {/* Waypoint number */}
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {index + 1}
                </div>

                {/* Waypoint info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {waypoint.label || `Waypoint ${index + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatCoords(waypoint)}
                  </p>
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeWaypoint(waypoint.id)}
                  className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distance summary */}
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total distance</span>
          <span className="font-semibold">
            {calculatedRoute
              ? `${formatDistance(calculatedRoute.distance)} km`
              : waypoints.length > 1
              ? 'Calculating...'
              : '--'}
          </span>
        </div>
        {waypoints.length > 1 && !calculatedRoute && (
          <p className="text-xs text-muted-foreground mt-1">
            Route calculation requires road data
          </p>
        )}
      </div>
    </div>
  );
}
