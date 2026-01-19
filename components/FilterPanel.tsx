'use client';

import { useFilterState } from '@/lib/store';
import { ROAD_CLASS_STYLES } from '@/lib/constants';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import type { RoadClass, RoadSurface } from '@/types';

// Human-readable labels for road classes
const ROAD_CLASS_LABELS: Record<RoadClass, string> = {
  highway: 'Highway',
  arterial: 'Arterial',
  collector: 'Collector',
  local: 'Local',
  resource: 'Resource/FSR',
  decommissioned: 'Decommissioned',
};

// Human-readable labels for road surfaces
const ROAD_SURFACE_LABELS: Record<RoadSurface, string> = {
  paved: 'Paved',
  loose: 'Gravel/Loose',
  rough: 'Rough',
  overgrown: 'Overgrown',
  decommissioned: 'Decommissioned',
};

// Road classes in display order
const ROAD_CLASSES: RoadClass[] = [
  'highway',
  'arterial',
  'collector',
  'local',
  'resource',
  'decommissioned',
];

// Road surfaces in display order
const ROAD_SURFACES: RoadSurface[] = [
  'paved',
  'loose',
  'rough',
  'overgrown',
  'decommissioned',
];

/**
 * Filter panel for toggling road visibility by class and surface type.
 * Connected to Zustand store for state management.
 */
export function FilterPanel() {
  const { roadFilters, toggleRoadClass, toggleRoadSurface, resetFilters } =
    useFilterState();

  // Check if any filters are disabled
  const hasActiveFilters =
    Object.values(roadFilters.roadClass).some((v) => !v) ||
    Object.values(roadFilters.roadSurface).some((v) => !v);

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Road Class Filters */}
      <div>
        <h4 className="text-sm font-medium mb-3">Road Type</h4>
        <div className="flex flex-col gap-2">
          {ROAD_CLASSES.map((roadClass) => {
            const style = ROAD_CLASS_STYLES[roadClass];
            const isEnabled = roadFilters.roadClass[roadClass];

            return (
              <Toggle
                key={roadClass}
                variant="outline"
                pressed={isEnabled}
                onPressedChange={() => toggleRoadClass(roadClass)}
                className="justify-start gap-3 h-auto py-2 px-3"
              >
                {/* Color indicator */}
                <span
                  className="w-4 h-1 rounded-full shrink-0"
                  style={{
                    backgroundColor: style.color,
                    opacity: isEnabled ? 1 : 0.3,
                    borderStyle: style.dash === 'dashed' ? 'dashed' : style.dash === 'dotted' ? 'dotted' : 'solid',
                    borderWidth: style.dash !== 'solid' ? '1px' : 0,
                    borderColor: style.dash !== 'solid' ? style.color : 'transparent',
                    height: style.dash !== 'solid' ? '0' : '4px',
                  }}
                />
                <span className={isEnabled ? '' : 'text-muted-foreground'}>
                  {ROAD_CLASS_LABELS[roadClass]}
                </span>
              </Toggle>
            );
          })}
        </div>
      </div>

      {/* Road Surface Filters */}
      <div>
        <h4 className="text-sm font-medium mb-3">Road Surface</h4>
        <div className="flex flex-col gap-2">
          {ROAD_SURFACES.map((surface) => {
            const isEnabled = roadFilters.roadSurface[surface];

            return (
              <Toggle
                key={surface}
                variant="outline"
                pressed={isEnabled}
                onPressedChange={() => toggleRoadSurface(surface)}
                className="justify-start gap-3 h-auto py-2 px-3"
              >
                {/* Surface indicator */}
                <SurfaceIndicator surface={surface} enabled={isEnabled} />
                <span className={isEnabled ? '' : 'text-muted-foreground'}>
                  {ROAD_SURFACE_LABELS[surface]}
                </span>
              </Toggle>
            );
          })}
        </div>
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="mt-2"
        >
          Reset Filters
        </Button>
      )}
    </div>
  );
}

/**
 * Visual indicator for road surface type
 */
function SurfaceIndicator({
  surface,
  enabled,
}: {
  surface: RoadSurface;
  enabled: boolean;
}) {
  const baseOpacity = enabled ? 1 : 0.3;

  switch (surface) {
    case 'paved':
      return (
        <span
          className="w-4 h-1 rounded-full bg-gray-600 shrink-0"
          style={{ opacity: baseOpacity }}
        />
      );
    case 'loose':
      return (
        <span
          className="w-4 h-1 rounded-full bg-gray-400 shrink-0"
          style={{ opacity: baseOpacity }}
        />
      );
    case 'rough':
      return (
        <span
          className="w-4 h-1 rounded-full bg-gray-800 shrink-0"
          style={{ opacity: baseOpacity }}
        />
      );
    case 'overgrown':
      return (
        <span
          className="w-4 h-1 rounded-full bg-gray-500 shrink-0"
          style={{ opacity: baseOpacity * 0.5 }}
        />
      );
    case 'decommissioned':
      return (
        <span
          className="w-4 h-1 rounded-full bg-gray-500 shrink-0"
          style={{ opacity: baseOpacity * 0.5 }}
        />
      );
  }
}
