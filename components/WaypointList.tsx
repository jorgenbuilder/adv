'use client';

import { useState } from 'react';
import { useRouteState } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, MapPin, Diamond, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import type { Waypoint, RoadClass, RoadClassDistances, RoadClassTravelTimes, RouteLeg } from '@/types';
import { ROAD_SPEEDS } from '@/lib/router';
import { ROAD_CLASS_STYLES } from '@/lib/constants';
import { RoadPreferenceControl } from '@/components/RoadPreferenceControl';

/**
 * Road class display names and colors
 */
const ROAD_CLASS_LABELS: Record<RoadClass, string> = {
  highway: 'Highway',
  arterial: 'Arterial',
  collector: 'Collector',
  local: 'Local',
  resource: 'Resource/FSR',
  decommissioned: 'Decommissioned',
};

/**
 * Format distance in km with appropriate precision
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format travel time in human-readable format
 */
function formatTravelTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }
  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

/**
 * Component to display distance and time breakdown by road type
 */
function RoadClassBreakdown({
  distanceByRoadClass,
  travelTimeByRoadClass,
}: {
  distanceByRoadClass: RoadClassDistances;
  travelTimeByRoadClass: RoadClassTravelTimes;
}) {
  // Filter to only show road classes with non-zero distance
  const activeClasses = (Object.keys(distanceByRoadClass) as RoadClass[]).filter(
    (rc) => distanceByRoadClass[rc] > 0
  );

  if (activeClasses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5 mt-2">
      {activeClasses.map((roadClass) => (
        <div key={roadClass} className="flex items-center gap-2 text-xs">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: ROAD_CLASS_STYLES[roadClass].color }}
          />
          <span className="flex-1 text-muted-foreground">{ROAD_CLASS_LABELS[roadClass]}</span>
          <span className="text-muted-foreground">
            {formatDistance(distanceByRoadClass[roadClass])}
          </span>
          <span className="text-muted-foreground/70 w-16 text-right">
            {formatTravelTime(travelTimeByRoadClass[roadClass])}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Calculate cumulative distances and times up to a waypoint index
 */
function getCumulativeStats(
  legs: RouteLeg[],
  waypointIndex: number
): {
  distance: number;
  distanceByRoadClass: RoadClassDistances;
  travelTime: number;
  travelTimeByRoadClass: RoadClassTravelTimes;
} | null {
  if (!legs || legs.length === 0 || waypointIndex === 0) {
    return null;
  }

  const distanceByRoadClass: RoadClassDistances = {
    highway: 0,
    arterial: 0,
    collector: 0,
    local: 0,
    resource: 0,
    decommissioned: 0,
  };
  const travelTimeByRoadClass: RoadClassTravelTimes = {
    highway: 0,
    arterial: 0,
    collector: 0,
    local: 0,
    resource: 0,
    decommissioned: 0,
  };
  let distance = 0;
  let travelTime = 0;

  // Sum up all legs that end at or before this waypoint
  for (const leg of legs) {
    if (leg.toWaypointIndex <= waypointIndex) {
      distance += leg.distance;
      travelTime += leg.travelTime;
      for (const roadClass of Object.keys(leg.distanceByRoadClass) as RoadClass[]) {
        distanceByRoadClass[roadClass] += leg.distanceByRoadClass[roadClass];
        travelTimeByRoadClass[roadClass] += leg.travelTimeByRoadClass[roadClass];
      }
    }
  }

  return { distance, distanceByRoadClass, travelTime, travelTimeByRoadClass };
}

/**
 * Waypoint card with expandable details
 */
function WaypointCard({
  waypoint,
  index,
  displayNumber,
  legs,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  waypoint: Waypoint;
  index: number;
  displayNumber: number;
  legs?: RouteLeg[];
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isAnchor = waypoint.type === 'anchor';

  // Format coordinates for display
  const formatCoords = () => {
    const pos = waypoint.snappedPosition || waypoint.position;
    return `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`;
  };

  // Get cumulative stats for this waypoint
  const cumulativeStats = legs ? getCumulativeStats(legs, index) : null;

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`cursor-move hover:border-primary/50 transition-colors ${
        isAnchor ? 'opacity-80' : ''
      }`}
    >
      <CardContent className="p-3 md:p-3 py-4 md:py-3">
        <div className="flex items-center gap-3 md:gap-2">
          {/* Drag handle */}
          <GripVertical className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground flex-shrink-0 touch-manipulation" />

          {/* Waypoint indicator */}
          {isAnchor ? (
            <div className="w-8 h-8 md:w-6 md:h-6 flex items-center justify-center flex-shrink-0">
              <Diamond className="w-5 h-5 md:w-4 md:h-4 text-blue-500" />
            </div>
          ) : (
            <div className="w-8 h-8 md:w-6 md:h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm md:text-xs font-bold flex-shrink-0">
              {displayNumber}
            </div>
          )}

          {/* Waypoint info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {waypoint.label || (isAnchor ? 'Anchor point' : `Waypoint ${displayNumber}`)}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate">{formatCoords()}</p>
              {cumulativeStats && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="font-medium">
                    {formatDistance(cumulativeStats.distance)}
                  </span>
                  <Clock className="w-3 h-3" />
                  <span>{formatTravelTime(cumulativeStats.travelTime)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Expand/collapse button for waypoints with stats */}
          {cumulativeStats && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              className="flex-shrink-0 h-8 w-8 text-muted-foreground"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          )}

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="flex-shrink-0 h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-destructive active:text-destructive touch-manipulation"
          >
            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
        </div>

        {/* Expanded details */}
        {expanded && cumulativeStats && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Distance by road type to this point:
            </p>
            <RoadClassBreakdown
              distanceByRoadClass={cumulativeStats.distanceByRoadClass}
              travelTimeByRoadClass={cumulativeStats.travelTimeByRoadClass}
            />
            <div className="mt-2 pt-2 border-t flex justify-between text-xs">
              <span className="text-muted-foreground">Speeds:</span>
              <span className="text-muted-foreground/70">
                {(Object.keys(ROAD_SPEEDS) as RoadClass[])
                  .filter((rc) => cumulativeStats.distanceByRoadClass[rc] > 0)
                  .map((rc) => `${ROAD_CLASS_LABELS[rc]}: ${ROAD_SPEEDS[rc]} km/h`)
                  .join(', ')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Waypoint list panel showing ordered list of waypoints
 * with distance calculation and delete/reorder functionality
 */
export function WaypointList() {
  const { waypoints, removeWaypoint, reorderWaypoints, clearRoute, calculatedRoute } =
    useRouteState();

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
        {waypoints.map((waypoint, index) => {
          const displayNumber = waypoints
            .slice(0, index + 1)
            .filter((wp) => wp.type !== 'anchor').length;

          return (
            <WaypointCard
              key={waypoint.id}
              waypoint={waypoint}
              index={index}
              displayNumber={displayNumber}
              legs={calculatedRoute?.legs}
              onRemove={() => removeWaypoint(waypoint.id)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            />
          );
        })}
      </div>

      {/* Road preferences */}
      <div className="mt-4 pt-4 border-t">
        <RoadPreferenceControl />
      </div>

      {/* Route summary */}
      <div className="mt-4 pt-4 border-t space-y-3">
        {/* Total distance and time */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold flex items-center gap-2">
            {calculatedRoute ? (
              <>
                {formatDistance(calculatedRoute.distance)}
                {calculatedRoute.travelTime !== undefined && calculatedRoute.travelTime > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground font-normal">
                    <Clock className="w-4 h-4" />
                    {formatTravelTime(calculatedRoute.travelTime)}
                  </span>
                )}
              </>
            ) : waypoints.length > 1 ? (
              'Calculating...'
            ) : (
              '--'
            )}
          </span>
        </div>

        {/* Total breakdown by road class */}
        {calculatedRoute?.distanceByRoadClass && calculatedRoute?.travelTimeByRoadClass && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Route breakdown:</p>
            <RoadClassBreakdown
              distanceByRoadClass={calculatedRoute.distanceByRoadClass}
              travelTimeByRoadClass={calculatedRoute.travelTimeByRoadClass}
            />
          </div>
        )}

        {waypoints.length > 1 && !calculatedRoute && (
          <p className="text-xs text-muted-foreground mt-1">
            Route calculation requires road data
          </p>
        )}
      </div>
    </div>
  );
}
