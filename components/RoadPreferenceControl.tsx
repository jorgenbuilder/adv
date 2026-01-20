'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferenceState } from '@/lib/store';
import { ROAD_CLASS_STYLES } from '@/lib/constants';
import type { RoadClass, RoadSurface } from '@/types';

// Human-readable labels for road types
const ROAD_TYPE_LABELS: Record<RoadClass, string> = {
  highway: 'Highway',
  arterial: 'Arterial',
  collector: 'Collector',
  local: 'Local',
  resource: 'FSR',
  decommissioned: 'Decommissioned',
};

// Human-readable labels for road surfaces
const ROAD_SURFACE_LABELS: Record<RoadSurface, string> = {
  paved: 'Paved',
  loose: 'Gravel',
  rough: 'Rough',
  overgrown: 'Overgrown',
  decommissioned: 'Decomm',
};

// Surface colors (grays with varying lightness)
const ROAD_SURFACE_COLORS: Record<RoadSurface, string> = {
  paved: '#374151',     // Dark gray
  loose: '#9ca3af',     // Medium gray
  rough: '#6b7280',     // Gray
  overgrown: '#d1d5db', // Light gray
  decommissioned: '#e5e7eb', // Very light gray
};

// Order for display
const ROAD_TYPE_ORDER: RoadClass[] = [
  'resource',
  'highway',
  'arterial',
  'collector',
  'local',
  'decommissioned',
];

const ROAD_SURFACE_ORDER: RoadSurface[] = [
  'loose',
  'paved',
  'rough',
  'overgrown',
  'decommissioned',
];

/**
 * Color blip component for visual indicator
 */
function ColorBlip({
  color,
  dash,
  className = '',
}: {
  color: string;
  dash?: 'solid' | 'dashed' | 'dotted';
  className?: string;
}) {
  const style: React.CSSProperties = {
    backgroundColor: color,
  };

  if (dash === 'dashed') {
    style.background = `repeating-linear-gradient(90deg, ${color} 0px, ${color} 2px, transparent 2px, transparent 4px)`;
    style.backgroundColor = 'transparent';
  } else if (dash === 'dotted') {
    style.background = `repeating-linear-gradient(90deg, ${color} 0px, ${color} 1px, transparent 1px, transparent 2px)`;
    style.backgroundColor = 'transparent';
  }

  return (
    <span
      className={`inline-block w-3 h-1.5 rounded-sm flex-shrink-0 ${className}`}
      style={style}
    />
  );
}

/**
 * Preference option with rank number and color blip
 */
function PreferenceOption<T extends RoadClass | RoadSurface>({
  value,
  label,
  color,
  dash,
  isSelected,
  rank,
  onToggle,
}: {
  value: T;
  label: string;
  color: string;
  dash?: 'solid' | 'dashed' | 'dotted';
  isSelected: boolean;
  rank?: number;
  onToggle: (value: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(value)}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded text-xs
        transition-colors
        ${isSelected
          ? 'bg-primary/10 border border-primary/30'
          : 'bg-muted/50 border border-transparent hover:bg-muted'
        }
      `}
    >
      {isSelected && rank !== undefined && (
        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold flex-shrink-0">
          {rank}
        </span>
      )}
      <ColorBlip color={color} dash={dash} />
      <span className={isSelected ? 'font-medium' : 'text-muted-foreground'}>
        {label}
      </span>
    </button>
  );
}

/**
 * Summary blips for collapsed view
 */
function PreferenceBlips<T extends RoadClass | RoadSurface>({
  items,
  getColor,
  getDash,
}: {
  items: T[];
  getColor: (item: T) => string;
  getDash?: (item: T) => 'solid' | 'dashed' | 'dotted' | undefined;
}) {
  if (items.length === 0) return null;

  return (
    <span className="flex items-center gap-0.5">
      {items.slice(0, 4).map((item, index) => (
        <ColorBlip
          key={item}
          color={getColor(item)}
          dash={getDash?.(item)}
        />
      ))}
      {items.length > 4 && (
        <span className="text-[10px] text-muted-foreground ml-0.5">+{items.length - 4}</span>
      )}
    </span>
  );
}

/**
 * Collapsible preference section
 */
function PreferenceSection<T extends RoadClass | RoadSurface>({
  title,
  items,
  selectedItems,
  order,
  getLabel,
  getColor,
  getDash,
  onToggle,
}: {
  title: string;
  items: T[];
  selectedItems: T[];
  order: T[];
  getLabel: (item: T) => string;
  getColor: (item: T) => string;
  getDash?: (item: T) => 'solid' | 'dashed' | 'dotted' | undefined;
  onToggle: (item: T) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Generate summary text
  const getSummaryText = () => {
    if (selectedItems.length === 0) {
      return 'None selected';
    }
    if (selectedItems.length === 1) {
      return `Prefer ${getLabel(selectedItems[0])}`;
    }
    return `Prefer ${selectedItems.length} ${title.toLowerCase()}`;
  };

  return (
    <div className="space-y-1">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors text-xs"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground font-medium shrink-0">{title}:</span>
          <span className="truncate">{getSummaryText()}</span>
          {!expanded && selectedItems.length > 0 && (
            <PreferenceBlips
              items={selectedItems}
              getColor={getColor}
              getDash={getDash}
            />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded options */}
      {expanded && (
        <div className="flex flex-wrap gap-1 pl-2">
          {order.map((item) => {
            const isSelected = selectedItems.includes(item);
            const rank = isSelected ? selectedItems.indexOf(item) + 1 : undefined;

            return (
              <PreferenceOption
                key={item}
                value={item}
                label={getLabel(item)}
                color={getColor(item)}
                dash={getDash?.(item)}
                isSelected={isSelected}
                rank={rank}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Road preference control for pathfinding preferences
 *
 * UI Design:
 * - Compact collapsed view showing current preference
 * - Expandable rank-order multiselect UI
 * - Visual blips match legend styles
 */
export function RoadPreferenceControl() {
  const { roadPreferences, toggleTypePreference, toggleSurfacePreference } = usePreferenceState();

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
        Route Preferences
      </div>

      {/* Road Type Preferences */}
      <PreferenceSection
        title="Types"
        items={roadPreferences.types}
        selectedItems={roadPreferences.types}
        order={ROAD_TYPE_ORDER}
        getLabel={(t) => ROAD_TYPE_LABELS[t]}
        getColor={(t) => ROAD_CLASS_STYLES[t].color}
        getDash={(t) => ROAD_CLASS_STYLES[t].dash as 'solid' | 'dashed' | 'dotted'}
        onToggle={toggleTypePreference}
      />

      {/* Road Surface Preferences */}
      <PreferenceSection
        title="Surfaces"
        items={roadPreferences.surfaces}
        selectedItems={roadPreferences.surfaces}
        order={ROAD_SURFACE_ORDER}
        getLabel={(s) => ROAD_SURFACE_LABELS[s]}
        getColor={(s) => ROAD_SURFACE_COLORS[s]}
        onToggle={toggleSurfacePreference}
      />
    </div>
  );
}
