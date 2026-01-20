/**
 * Constants for Vancouver Island Adventure Map
 */

// Vancouver Island bounding box
export const VANCOUVER_ISLAND_BOUNDS = {
  northwest: { lat: 50.8, lng: -128.5 },
  southeast: { lat: 48.3, lng: -123.3 },
} as const;

// Default map center (approximate center of Vancouver Island)
export const DEFAULT_MAP_CENTER = {
  lat: 49.55,
  lng: -125.9,
} as const;

export const DEFAULT_ZOOM = 8;

// MapTiler API key
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';

// Road styling by classification
// Each road type has a distinct color, width, and dash pattern for clear visual differentiation
export const ROAD_CLASS_STYLES = {
  highway: { color: '#e63946', width: 4, dash: 'solid' },      // Red - major roads
  arterial: { color: '#457b9d', width: 3, dash: 'solid' },     // Blue - arterial roads
  collector: { color: '#2a9d8f', width: 2.5, dash: 'solid' },  // Teal - collector roads
  local: { color: '#e9c46a', width: 2, dash: 'solid' },        // Gold - local roads
  resource: { color: '#8b4513', width: 2, dash: 'dashed' },    // Brown dashed - resource roads
  decommissioned: { color: '#6c757d', width: 1.5, dash: 'dotted' }, // Gray dotted - decommissioned
} as const;

// Road surface style modifiers
export const ROAD_SURFACE_MODIFIERS = {
  paved: { opacity: 1, lighten: 0 },
  loose: { opacity: 1, lighten: 0.2 },
  rough: { opacity: 1, lighten: -0.2 },
  overgrown: { opacity: 0.5, lighten: 0 },
  decommissioned: { opacity: 0.5, lighten: 0 },
} as const;

// URL parameter names
export const URL_PARAMS = {
  waypoints: 'w',
  zoom: 'z',
  center: 'c',
  filters: 'f',
} as const;

// File paths for static assets
export const ASSET_PATHS = {
  roadTiles: '/vi-roads.pmtiles',
  routingGraph: '/vi-graph.json',
} as const;
