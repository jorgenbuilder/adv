/**
 * Type definitions for Vancouver Island Adventure Map
 */

// Road classification types from BC Digital Road Atlas
export type RoadClass =
  | 'highway'
  | 'arterial'
  | 'collector'
  | 'local'
  | 'resource'
  | 'decommissioned';

export type RoadSurface =
  | 'paved'
  | 'loose'
  | 'rough'
  | 'overgrown'
  | 'decommissioned';

// DRA road segment attributes
export interface RoadSegment {
  id: string;
  roadClass: RoadClass;
  roadSurface: RoadSurface;
  roadName: string | null;
  roadNameAlias1: string | null;
  roadNameAlias2: string | null;
  roadNameAlias3: string | null;
  numLanes: number;
  segmentLength2D: number; // meters
  speedLimit: number | null;
  accessRestriction: string | null;
}

// Map coordinates
export interface LatLng {
  lat: number;
  lng: number;
}

// Waypoint for route planning
export interface Waypoint {
  id: string;
  position: LatLng;
  snappedPosition: LatLng | null;
  label?: string;
}

// Route state
export interface Route {
  waypoints: Waypoint[];
  path: LatLng[]; // Interpolated path along roads
  distance: number; // Total distance in meters
}

// Filter state for road visibility
export interface RoadFilters {
  roadClass: Record<RoadClass, boolean>;
  roadSurface: Record<RoadSurface, boolean>;
}

// Map view state
export interface MapViewState {
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

// URL state for sharing
export interface URLState {
  waypoints: LatLng[];
  zoom: number;
  center: LatLng;
  filters: number; // Bitfield encoding of filters
}

// Routing graph node
export interface GraphNode {
  id: string;
  position: LatLng;
  edges: GraphEdge[];
}

// Routing graph edge
export interface GraphEdge {
  targetNodeId: string;
  roadSegmentId: string;
  weight: number; // Distance in meters
}
