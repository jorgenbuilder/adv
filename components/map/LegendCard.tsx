'use client';

import { useFilterState } from '@/lib/store';
import { ROAD_CLASS_STYLES } from '@/lib/constants';
import type { RoadClass, RoadSurface } from '@/types';

// Human-readable labels for road classes
const ROAD_CLASS_LABELS: Record<RoadClass, string> = {
  highway: 'Highway',
  arterial: 'Arterial',
  collector: 'Collector',
  local: 'Local',
  resource: 'Resource',
  decommissioned: 'Decommissioned',
};

// Human-readable labels for road surfaces
const ROAD_SURFACE_LABELS: Record<RoadSurface, string> = {
  paved: 'Paved',
  loose: 'Loose',
  rough: 'Rough',
  overgrown: 'Overgrown',
  decommissioned: 'Decommissioned',
};

// Order for display
const ROAD_CLASS_ORDER: RoadClass[] = [
  'highway',
  'arterial',
  'collector',
  'local',
  'resource',
  'decommissioned',
];

const ROAD_SURFACE_ORDER: RoadSurface[] = [
  'paved',
  'loose',
  'rough',
  'overgrown',
  'decommissioned',
];

interface LegendItemProps {
  label: string;
  color: string;
  checked: boolean;
  onChange: () => void;
  dash?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
}

function LegendItem({ label, color, checked, onChange, dash = 'solid', opacity = 1 }: LegendItemProps) {
  // Generate line style for the legend swatch
  const lineStyle: React.CSSProperties = {
    backgroundColor: color,
    opacity,
  };

  if (dash === 'dashed') {
    lineStyle.background = `repeating-linear-gradient(90deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 6px)`;
    lineStyle.backgroundColor = 'transparent';
  } else if (dash === 'dotted') {
    lineStyle.background = `repeating-linear-gradient(90deg, ${color} 0px, ${color} 2px, transparent 2px, transparent 4px)`;
    lineStyle.backgroundColor = 'transparent';
  }

  return (
    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-1"
      />
      <span
        className="w-5 h-0.5 flex-shrink-0 rounded-full"
        style={lineStyle}
      />
      <span className={`truncate ${!checked ? 'text-muted-foreground line-through' : ''}`}>
        {label}
      </span>
    </label>
  );
}

interface SurfaceItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  modifier: string;
}

function SurfaceItem({ label, checked, onChange, modifier }: SurfaceItemProps) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-1"
      />
      <span className={`truncate ${!checked ? 'text-muted-foreground line-through' : ''}`}>
        {label}
      </span>
      <span className="text-muted-foreground text-[10px]">
        {modifier}
      </span>
    </label>
  );
}

/**
 * Legend card overlay for the map
 * Shows road types and surfaces with toggleable checkboxes
 */
export function LegendCard() {
  const { roadFilters, toggleRoadClass, toggleRoadSurface } = useFilterState();

  return (
    <div className="bg-background/90 backdrop-blur-sm rounded-lg shadow-lg border p-2 w-44 text-xs">
      {/* Road Types Section */}
      <div className="mb-2">
        <div className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-1">
          Road Type
        </div>
        <div className="space-y-0">
          {ROAD_CLASS_ORDER.map((roadClass) => {
            const style = ROAD_CLASS_STYLES[roadClass];
            return (
              <LegendItem
                key={roadClass}
                label={ROAD_CLASS_LABELS[roadClass]}
                color={style.color}
                dash={style.dash as 'solid' | 'dashed' | 'dotted'}
                checked={roadFilters.roadClass[roadClass]}
                onChange={() => toggleRoadClass(roadClass)}
              />
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t my-2" />

      {/* Road Surface Section */}
      <div>
        <div className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground mb-1 px-1">
          Surface
        </div>
        <div className="space-y-0">
          {ROAD_SURFACE_ORDER.map((surface) => {
            // Get modifier description
            const modifierText =
              surface === 'paved' ? '' :
              surface === 'loose' ? '(lighter)' :
              surface === 'rough' ? '(darker)' :
              surface === 'overgrown' ? '(faded)' :
              surface === 'decommissioned' ? '(faded)' : '';

            return (
              <SurfaceItem
                key={surface}
                label={ROAD_SURFACE_LABELS[surface]}
                modifier={modifierText}
                checked={roadFilters.roadSurface[surface]}
                onChange={() => toggleRoadSurface(surface)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
