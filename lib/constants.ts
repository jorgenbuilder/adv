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
export const ROAD_CLASS_STYLES = {
  highway: { color: '#ff6b35', width: 4, dash: 'solid' },
  arterial: { color: '#f7c59f', width: 3, dash: 'solid' },
  collector: { color: '#efefef', width: 2, dash: 'solid' },
  local: { color: '#a0a0a0', width: 1.5, dash: 'solid' },
  resource: { color: '#8b4513', width: 2, dash: 'dashed' },
  decommissioned: { color: '#666666', width: 1, dash: 'dotted' },
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
