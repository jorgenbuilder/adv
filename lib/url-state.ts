/**
 * URL State Sync for Route Sharing
 *
 * Syncs route state to URL parameters in real-time:
 * - w: waypoints as lat,lng pairs (e.g., "48.4284,-123.3656,48.5,-123.4")
 * - z: zoom level
 * - c: map center as lat,lng
 * - p: pitch
 * - b: bearing
 * - f: filter bitfield (road classes and surfaces)
 *
 * URL format: /?w=48.4284,-123.3656,48.5,-123.4&z=10&c=48.5,-123.4&p=45&b=0&f=2047
 */

import type { LatLng, RoadFilters, RoadClass, RoadSurface, RoadPreferences, WaypointType } from '@/types';

/**
 * Encoded waypoint with type information
 */
export interface EncodedWaypoint {
  position: LatLng;
  type: WaypointType;
}

// Bitfield positions for road filters
// Road classes (bits 0-5)
const ROAD_CLASS_BITS: Record<RoadClass, number> = {
  highway: 0,
  arterial: 1,
  collector: 2,
  local: 3,
  resource: 4,
  decommissioned: 5,
};

// Road surfaces (bits 6-10)
const ROAD_SURFACE_BITS: Record<RoadSurface, number> = {
  paved: 6,
  loose: 7,
  rough: 8,
  overgrown: 9,
  decommissioned: 10,
};

// All filters enabled = 2047 (binary: 11111111111)
export const ALL_FILTERS_ENABLED = 2047;

// Road class short codes for URL encoding
const ROAD_CLASS_CODES: Record<RoadClass, string> = {
  highway: 'h',
  arterial: 'a',
  collector: 'c',
  local: 'l',
  resource: 'r',
  decommissioned: 'd',
};

const CODE_TO_ROAD_CLASS: Record<string, RoadClass> = {
  h: 'highway',
  a: 'arterial',
  c: 'collector',
  l: 'local',
  r: 'resource',
  d: 'decommissioned',
};

// Road surface short codes for URL encoding
const ROAD_SURFACE_CODES: Record<RoadSurface, string> = {
  paved: 'p',
  loose: 'l',
  rough: 'r',
  overgrown: 'o',
  decommissioned: 'd',
};

const CODE_TO_ROAD_SURFACE: Record<string, RoadSurface> = {
  p: 'paved',
  l: 'loose',
  r: 'rough',
  o: 'overgrown',
  d: 'decommissioned',
};

/**
 * Encode road preferences to URL string
 * Format: "t:r,h,a;s:l,r" (types:resource,highway,arterial;surfaces:loose,rough)
 */
export function encodePreferences(prefs: RoadPreferences): string {
  const typeCodes = prefs.types.map((t) => ROAD_CLASS_CODES[t]).join('');
  const surfaceCodes = prefs.surfaces.map((s) => ROAD_SURFACE_CODES[s]).join('');

  // Only include non-empty parts
  const parts: string[] = [];
  if (typeCodes) parts.push(`t${typeCodes}`);
  if (surfaceCodes) parts.push(`s${surfaceCodes}`);

  return parts.join('.');
}

/**
 * Decode road preferences from URL string
 */
export function decodePreferences(encoded: string): RoadPreferences {
  const prefs: RoadPreferences = { types: [], surfaces: [] };

  if (!encoded) return prefs;

  const parts = encoded.split('.');
  for (const part of parts) {
    if (part.startsWith('t')) {
      // Type preferences
      const codes = part.slice(1).split('');
      prefs.types = codes
        .map((c) => CODE_TO_ROAD_CLASS[c])
        .filter((t): t is RoadClass => t !== undefined);
    } else if (part.startsWith('s')) {
      // Surface preferences
      const codes = part.slice(1).split('');
      prefs.surfaces = codes
        .map((c) => CODE_TO_ROAD_SURFACE[c])
        .filter((s): s is RoadSurface => s !== undefined);
    }
  }

  return prefs;
}

// Default preferences for comparison
const DEFAULT_PREFERENCES: RoadPreferences = {
  types: ['resource'],
  surfaces: ['loose'],
};

/**
 * Check if preferences are equal to defaults
 */
function preferencesAreDefault(prefs: RoadPreferences): boolean {
  return (
    prefs.types.length === DEFAULT_PREFERENCES.types.length &&
    prefs.types.every((t, i) => t === DEFAULT_PREFERENCES.types[i]) &&
    prefs.surfaces.length === DEFAULT_PREFERENCES.surfaces.length &&
    prefs.surfaces.every((s, i) => s === DEFAULT_PREFERENCES.surfaces[i])
  );
}

/**
 * Encode road filters as a bitfield number
 */
export function encodeFilters(filters: RoadFilters): number {
  let bitfield = 0;

  // Encode road classes
  for (const [roadClass, bit] of Object.entries(ROAD_CLASS_BITS)) {
    if (filters.roadClass[roadClass as RoadClass]) {
      bitfield |= 1 << bit;
    }
  }

  // Encode road surfaces
  for (const [surface, bit] of Object.entries(ROAD_SURFACE_BITS)) {
    if (filters.roadSurface[surface as RoadSurface]) {
      bitfield |= 1 << bit;
    }
  }

  return bitfield;
}

/**
 * Decode bitfield number to road filters
 */
export function decodeFilters(bitfield: number): RoadFilters {
  const filters: RoadFilters = {
    roadClass: {
      highway: false,
      arterial: false,
      collector: false,
      local: false,
      resource: false,
      decommissioned: false,
    },
    roadSurface: {
      paved: false,
      loose: false,
      rough: false,
      overgrown: false,
      decommissioned: false,
    },
  };

  // Decode road classes
  for (const [roadClass, bit] of Object.entries(ROAD_CLASS_BITS)) {
    filters.roadClass[roadClass as RoadClass] = (bitfield & (1 << bit)) !== 0;
  }

  // Decode road surfaces
  for (const [surface, bit] of Object.entries(ROAD_SURFACE_BITS)) {
    filters.roadSurface[surface as RoadSurface] = (bitfield & (1 << bit)) !== 0;
  }

  return filters;
}

// Precision for coordinates in URL (5 decimal places ~= 1 meter)
const COORD_PRECISION = 5;

/**
 * Parse waypoints from URL parameter
 * Format: "lat1,lng1,lat2,lng2,..." (legacy) or with type markers "lat1,lng1,a:lat2,lng2,lat3,lng3"
 * The "a:" prefix indicates an anchor point
 */
export function parseWaypointsFromURL(param: string | null): EncodedWaypoint[] {
  if (!param) return [];

  // Split by commas, but keep potential "a:" prefixes attached
  const parts = param.split(',');
  const waypoints: EncodedWaypoint[] = [];

  let i = 0;
  while (i < parts.length - 1) {
    let latStr = parts[i];
    const lngStr = parts[i + 1];

    // Check for anchor prefix
    let type: WaypointType = 'primary';
    if (latStr.startsWith('a:')) {
      type = 'anchor';
      latStr = latStr.substring(2);
    }

    const lat = Number(latStr);
    const lng = Number(lngStr);

    if (!isNaN(lat) && !isNaN(lng)) {
      waypoints.push({ position: { lat, lng }, type });
    }

    i += 2;
  }

  return waypoints;
}

/**
 * Legacy parse function that returns just positions (for backward compatibility)
 */
export function parseWaypointPositionsFromURL(param: string | null): LatLng[] {
  return parseWaypointsFromURL(param).map(wp => wp.position);
}

/**
 * Serialize waypoints to URL parameter
 * Format: "lat1,lng1,a:lat2,lng2,lat3,lng3" where "a:" prefix indicates anchor
 */
export function serializeWaypointsToURL(waypoints: EncodedWaypoint[]): string {
  if (waypoints.length === 0) return '';

  return waypoints
    .map((wp) => {
      const prefix = wp.type === 'anchor' ? 'a:' : '';
      return `${prefix}${wp.position.lat.toFixed(COORD_PRECISION)},${wp.position.lng.toFixed(COORD_PRECISION)}`;
    })
    .join(',');
}

/**
 * Legacy serialize function for just positions (for backward compatibility)
 */
export function serializePositionsToURL(positions: LatLng[]): string {
  return serializeWaypointsToURL(positions.map(pos => ({ position: pos, type: 'primary' as WaypointType })));
}

/**
 * Parse center from URL parameter
 * Format: "lat,lng"
 */
export function parseCenterFromURL(param: string | null): LatLng | null {
  if (!param) return null;

  const [lat, lng] = param.split(',').map(Number);
  if (!isNaN(lat) && !isNaN(lng)) {
    return { lat, lng };
  }
  return null;
}

/**
 * Serialize center to URL parameter
 */
export function serializeCenterToURL(center: LatLng): string {
  return `${center.lat.toFixed(COORD_PRECISION)},${center.lng.toFixed(COORD_PRECISION)}`;
}

/**
 * Parse numeric value from URL parameter
 */
export function parseNumberFromURL(
  param: string | null,
  defaultValue: number
): number {
  if (!param) return defaultValue;
  const value = parseFloat(param);
  return isNaN(value) ? defaultValue : value;
}

/**
 * Build full URL with state parameters
 */
export function buildShareURL(params: {
  waypoints: EncodedWaypoint[];
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
  filters?: RoadFilters;
  preferences?: RoadPreferences;
}): string {
  const searchParams = new URLSearchParams();

  // Add waypoints (with anchor type markers)
  const waypointsStr = serializeWaypointsToURL(params.waypoints);
  if (waypointsStr) {
    searchParams.set('w', waypointsStr);
  }

  // Add map view state
  searchParams.set('z', params.zoom.toFixed(1));
  searchParams.set('c', serializeCenterToURL(params.center));

  if (params.pitch && params.pitch > 0) {
    searchParams.set('p', params.pitch.toFixed(0));
  }

  if (params.bearing && params.bearing !== 0) {
    searchParams.set('b', params.bearing.toFixed(0));
  }

  // Add filters (only if not all enabled)
  if (params.filters) {
    const filterBitfield = encodeFilters(params.filters);
    if (filterBitfield !== ALL_FILTERS_ENABLED) {
      searchParams.set('f', filterBitfield.toString());
    }
  }

  // Add preferences (only if not default)
  if (params.preferences && !preferencesAreDefault(params.preferences)) {
    const prefsStr = encodePreferences(params.preferences);
    if (prefsStr) {
      searchParams.set('pref', prefsStr);
    }
  }

  // Build URL
  const baseURL = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return `${baseURL}?${searchParams.toString()}`;
}

/**
 * Parse state from current URL
 */
export function parseStateFromURL(): {
  waypoints: EncodedWaypoint[];
  center: LatLng | null;
  zoom: number | null;
  pitch: number | null;
  bearing: number | null;
  filters: RoadFilters | null;
  preferences: RoadPreferences | null;
} {
  if (typeof window === 'undefined') {
    return {
      waypoints: [],
      center: null,
      zoom: null,
      pitch: null,
      bearing: null,
      filters: null,
      preferences: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  // Parse filters from URL
  let filters: RoadFilters | null = null;
  if (params.has('f')) {
    const filterBitfield = parseInt(params.get('f') || '0', 10);
    if (!isNaN(filterBitfield)) {
      filters = decodeFilters(filterBitfield);
    }
  }

  // Parse preferences from URL
  let preferences: RoadPreferences | null = null;
  if (params.has('pref')) {
    preferences = decodePreferences(params.get('pref') || '');
  }

  return {
    waypoints: parseWaypointsFromURL(params.get('w')),
    center: parseCenterFromURL(params.get('c')),
    zoom: params.has('z') ? parseNumberFromURL(params.get('z'), 8) : null,
    pitch: params.has('p') ? parseNumberFromURL(params.get('p'), 0) : null,
    bearing: params.has('b') ? parseNumberFromURL(params.get('b'), 0) : null,
    filters,
    preferences,
  };
}

/**
 * Update URL without causing navigation
 */
export function updateURL(params: {
  waypoints: EncodedWaypoint[];
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
  filters?: RoadFilters;
  preferences?: RoadPreferences;
}): void {
  if (typeof window === 'undefined') return;

  const url = buildShareURL(params);
  window.history.replaceState({}, '', url);
}
