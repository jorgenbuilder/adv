/**
 * URL State Sync for Route Sharing
 *
 * Syncs route state to URL parameters in real-time:
 * - w: waypoints as lat,lng pairs (e.g., "48.4284,-123.3656,48.5,-123.4")
 * - z: zoom level
 * - c: map center as lat,lng
 * - p: pitch
 * - b: bearing
 *
 * URL format: /?w=48.4284,-123.3656,48.5,-123.4&z=10&c=48.5,-123.4&p=45&b=0
 */

import type { LatLng } from '@/types';

// Precision for coordinates in URL (5 decimal places ~= 1 meter)
const COORD_PRECISION = 5;

/**
 * Parse waypoints from URL parameter
 * Format: "lat1,lng1,lat2,lng2,..."
 */
export function parseWaypointsFromURL(param: string | null): LatLng[] {
  if (!param) return [];

  const values = param.split(',').map(Number);
  const waypoints: LatLng[] = [];

  for (let i = 0; i < values.length - 1; i += 2) {
    const lat = values[i];
    const lng = values[i + 1];
    if (!isNaN(lat) && !isNaN(lng)) {
      waypoints.push({ lat, lng });
    }
  }

  return waypoints;
}

/**
 * Serialize waypoints to URL parameter
 */
export function serializeWaypointsToURL(waypoints: LatLng[]): string {
  if (waypoints.length === 0) return '';

  return waypoints
    .map((wp) => `${wp.lat.toFixed(COORD_PRECISION)},${wp.lng.toFixed(COORD_PRECISION)}`)
    .join(',');
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
  waypoints: LatLng[];
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
}): string {
  const searchParams = new URLSearchParams();

  // Add waypoints
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

  // Build URL
  const baseURL = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return `${baseURL}?${searchParams.toString()}`;
}

/**
 * Parse state from current URL
 */
export function parseStateFromURL(): {
  waypoints: LatLng[];
  center: LatLng | null;
  zoom: number | null;
  pitch: number | null;
  bearing: number | null;
} {
  if (typeof window === 'undefined') {
    return {
      waypoints: [],
      center: null,
      zoom: null,
      pitch: null,
      bearing: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    waypoints: parseWaypointsFromURL(params.get('w')),
    center: parseCenterFromURL(params.get('c')),
    zoom: params.has('z') ? parseNumberFromURL(params.get('z'), 8) : null,
    pitch: params.has('p') ? parseNumberFromURL(params.get('p'), 0) : null,
    bearing: params.has('b') ? parseNumberFromURL(params.get('b'), 0) : null,
  };
}

/**
 * Update URL without causing navigation
 */
export function updateURL(params: {
  waypoints: LatLng[];
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
}): void {
  if (typeof window === 'undefined') return;

  const url = buildShareURL(params);
  window.history.replaceState({}, '', url);
}
