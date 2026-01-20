import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
  LatLng,
  Waypoint,
  WaypointType,
  Route,
  RoadFilters,
  RoadClass,
  RoadSurface,
  RoadPreferences,
} from '@/types';
import { DEFAULT_MAP_CENTER, DEFAULT_ZOOM } from './constants';

/**
 * Map state slice
 */
interface MapState {
  center: LatLng;
  zoom: number;
  pitch: number;
  bearing: number;
  setCenter: (center: LatLng) => void;
  setZoom: (zoom: number) => void;
  setPitch: (pitch: number) => void;
  setBearing: (bearing: number) => void;
  setView: (view: Partial<MapState>) => void;
}

/**
 * Route state slice
 */
interface RouteState {
  waypoints: Waypoint[];
  calculatedRoute: Route | null;
  addWaypoint: (position: LatLng, type?: WaypointType) => void;
  insertWaypoint: (position: LatLng, afterIndex: number, type?: WaypointType) => void;
  removeWaypoint: (id: string) => void;
  updateWaypoint: (id: string, position: LatLng) => void;
  reorderWaypoints: (fromIndex: number, toIndex: number) => void;
  clearRoute: () => void;
  setCalculatedRoute: (route: Route | null) => void;
}

/**
 * Filter state slice
 */
interface FilterState {
  roadFilters: RoadFilters;
  toggleRoadClass: (roadClass: RoadClass) => void;
  toggleRoadSurface: (roadSurface: RoadSurface) => void;
  setRoadClassFilter: (roadClass: RoadClass, enabled: boolean) => void;
  setRoadSurfaceFilter: (roadSurface: RoadSurface, enabled: boolean) => void;
  setRoadFilters: (filters: RoadFilters) => void;
  resetFilters: () => void;
}

/**
 * Preference state slice for pathfinding preferences
 */
interface PreferenceState {
  roadPreferences: RoadPreferences;
  toggleTypePreference: (roadClass: RoadClass) => void;
  toggleSurfacePreference: (surface: RoadSurface) => void;
  setRoadPreferences: (prefs: RoadPreferences) => void;
  resetPreferences: () => void;
}

/**
 * UI state slice
 */
interface UIState {
  filterPanelOpen: boolean;
  waypointPanelOpen: boolean;
  legendExpanded: boolean;
  setFilterPanelOpen: (open: boolean) => void;
  setWaypointPanelOpen: (open: boolean) => void;
  setLegendExpanded: (expanded: boolean) => void;
  toggleFilterPanel: () => void;
  toggleWaypointPanel: () => void;
  toggleLegend: () => void;
}

/**
 * Combined store type
 */
export type AppState = MapState & RouteState & FilterState & PreferenceState & UIState;

// Generate unique ID for waypoints
let waypointIdCounter = 0;
const generateWaypointId = () => `wp-${++waypointIdCounter}`;

// Default filter state - all road classes and surfaces visible
const defaultRoadFilters: RoadFilters = {
  roadClass: {
    highway: true,
    arterial: true,
    collector: true,
    local: true,
    resource: true,
    decommissioned: true,
  },
  roadSurface: {
    paved: true,
    loose: true,
    rough: true,
    overgrown: true,
    decommissioned: true,
  },
};

// Default road preferences for pathfinding
const defaultRoadPreferences: RoadPreferences = {
  types: ['resource'],  // Default: prefer FSR/resource roads
  surfaces: ['loose'],  // Default: prefer gravel/loose surfaces
};

/**
 * Main application store
 */
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Map state
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      setCenter: (center) => set({ center }, undefined, 'setCenter'),
      setZoom: (zoom) => set({ zoom }, undefined, 'setZoom'),
      setPitch: (pitch) => set({ pitch }, undefined, 'setPitch'),
      setBearing: (bearing) => set({ bearing }, undefined, 'setBearing'),
      setView: (view) => set(view, undefined, 'setView'),

      // Route state
      waypoints: [],
      calculatedRoute: null,
      addWaypoint: (position, type = 'primary') =>
        set(
          (state) => ({
            waypoints: [
              ...state.waypoints,
              {
                id: generateWaypointId(),
                position,
                snappedPosition: null, // Will be set by road snapping
                type,
              },
            ],
          }),
          undefined,
          'addWaypoint'
        ),
      insertWaypoint: (position, afterIndex, type = 'anchor') =>
        set(
          (state) => {
            const waypoints = [...state.waypoints];
            const newWaypoint: Waypoint = {
              id: generateWaypointId(),
              position,
              snappedPosition: null,
              type,
            };
            // Insert after the specified index
            waypoints.splice(afterIndex + 1, 0, newWaypoint);
            return { waypoints };
          },
          undefined,
          'insertWaypoint'
        ),
      removeWaypoint: (id) =>
        set(
          (state) => ({
            waypoints: state.waypoints.filter((wp) => wp.id !== id),
          }),
          undefined,
          'removeWaypoint'
        ),
      updateWaypoint: (id, position) =>
        set(
          (state) => ({
            waypoints: state.waypoints.map((wp) =>
              wp.id === id ? { ...wp, position, snappedPosition: null } : wp
            ),
          }),
          undefined,
          'updateWaypoint'
        ),
      reorderWaypoints: (fromIndex, toIndex) =>
        set(
          (state) => {
            const waypoints = [...state.waypoints];
            const [removed] = waypoints.splice(fromIndex, 1);
            waypoints.splice(toIndex, 0, removed);
            return { waypoints };
          },
          undefined,
          'reorderWaypoints'
        ),
      clearRoute: () =>
        set(
          { waypoints: [], calculatedRoute: null },
          undefined,
          'clearRoute'
        ),
      setCalculatedRoute: (route) =>
        set({ calculatedRoute: route }, undefined, 'setCalculatedRoute'),

      // Filter state
      roadFilters: defaultRoadFilters,
      toggleRoadClass: (roadClass) =>
        set(
          (state) => ({
            roadFilters: {
              ...state.roadFilters,
              roadClass: {
                ...state.roadFilters.roadClass,
                [roadClass]: !state.roadFilters.roadClass[roadClass],
              },
            },
          }),
          undefined,
          'toggleRoadClass'
        ),
      toggleRoadSurface: (roadSurface) =>
        set(
          (state) => ({
            roadFilters: {
              ...state.roadFilters,
              roadSurface: {
                ...state.roadFilters.roadSurface,
                [roadSurface]: !state.roadFilters.roadSurface[roadSurface],
              },
            },
          }),
          undefined,
          'toggleRoadSurface'
        ),
      setRoadClassFilter: (roadClass, enabled) =>
        set(
          (state) => ({
            roadFilters: {
              ...state.roadFilters,
              roadClass: {
                ...state.roadFilters.roadClass,
                [roadClass]: enabled,
              },
            },
          }),
          undefined,
          'setRoadClassFilter'
        ),
      setRoadSurfaceFilter: (roadSurface, enabled) =>
        set(
          (state) => ({
            roadFilters: {
              ...state.roadFilters,
              roadSurface: {
                ...state.roadFilters.roadSurface,
                [roadSurface]: enabled,
              },
            },
          }),
          undefined,
          'setRoadSurfaceFilter'
        ),
      setRoadFilters: (filters) =>
        set({ roadFilters: filters }, undefined, 'setRoadFilters'),
      resetFilters: () =>
        set({ roadFilters: defaultRoadFilters }, undefined, 'resetFilters'),

      // Preference state
      roadPreferences: defaultRoadPreferences,
      toggleTypePreference: (roadClass) =>
        set(
          (state) => {
            const types = [...state.roadPreferences.types];
            const index = types.indexOf(roadClass);
            if (index >= 0) {
              // Remove if already in list
              types.splice(index, 1);
            } else {
              // Add to end of list
              types.push(roadClass);
            }
            return {
              roadPreferences: { ...state.roadPreferences, types },
            };
          },
          undefined,
          'toggleTypePreference'
        ),
      toggleSurfacePreference: (surface) =>
        set(
          (state) => {
            const surfaces = [...state.roadPreferences.surfaces];
            const index = surfaces.indexOf(surface);
            if (index >= 0) {
              // Remove if already in list
              surfaces.splice(index, 1);
            } else {
              // Add to end of list
              surfaces.push(surface);
            }
            return {
              roadPreferences: { ...state.roadPreferences, surfaces },
            };
          },
          undefined,
          'toggleSurfacePreference'
        ),
      setRoadPreferences: (prefs) =>
        set({ roadPreferences: prefs }, undefined, 'setRoadPreferences'),
      resetPreferences: () =>
        set({ roadPreferences: defaultRoadPreferences }, undefined, 'resetPreferences'),

      // UI state
      filterPanelOpen: false,
      waypointPanelOpen: true,
      legendExpanded: false,
      setFilterPanelOpen: (open) =>
        set({ filterPanelOpen: open }, undefined, 'setFilterPanelOpen'),
      setWaypointPanelOpen: (open) =>
        set({ waypointPanelOpen: open }, undefined, 'setWaypointPanelOpen'),
      setLegendExpanded: (expanded) =>
        set({ legendExpanded: expanded }, undefined, 'setLegendExpanded'),
      toggleFilterPanel: () =>
        set(
          (state) => ({ filterPanelOpen: !state.filterPanelOpen }),
          undefined,
          'toggleFilterPanel'
        ),
      toggleWaypointPanel: () =>
        set(
          (state) => ({ waypointPanelOpen: !state.waypointPanelOpen }),
          undefined,
          'toggleWaypointPanel'
        ),
      toggleLegend: () =>
        set(
          (state) => ({ legendExpanded: !state.legendExpanded }),
          undefined,
          'toggleLegend'
        ),
    }),
    { name: 'AdventureMapStore' }
  )
);

// Selector hooks for common patterns
export const useMapState = () =>
  useAppStore(
    useShallow((state) => ({
      center: state.center,
      zoom: state.zoom,
      pitch: state.pitch,
      bearing: state.bearing,
      setCenter: state.setCenter,
      setZoom: state.setZoom,
      setPitch: state.setPitch,
      setBearing: state.setBearing,
      setView: state.setView,
    }))
  );

export const useRouteState = () =>
  useAppStore(
    useShallow((state) => ({
      waypoints: state.waypoints,
      calculatedRoute: state.calculatedRoute,
      addWaypoint: state.addWaypoint,
      insertWaypoint: state.insertWaypoint,
      removeWaypoint: state.removeWaypoint,
      updateWaypoint: state.updateWaypoint,
      reorderWaypoints: state.reorderWaypoints,
      clearRoute: state.clearRoute,
      setCalculatedRoute: state.setCalculatedRoute,
    }))
  );

export const useFilterState = () =>
  useAppStore(
    useShallow((state) => ({
      roadFilters: state.roadFilters,
      toggleRoadClass: state.toggleRoadClass,
      toggleRoadSurface: state.toggleRoadSurface,
      setRoadClassFilter: state.setRoadClassFilter,
      setRoadSurfaceFilter: state.setRoadSurfaceFilter,
      setRoadFilters: state.setRoadFilters,
      resetFilters: state.resetFilters,
    }))
  );

export const useUIState = () =>
  useAppStore(
    useShallow((state) => ({
      filterPanelOpen: state.filterPanelOpen,
      waypointPanelOpen: state.waypointPanelOpen,
      legendExpanded: state.legendExpanded,
      setFilterPanelOpen: state.setFilterPanelOpen,
      setWaypointPanelOpen: state.setWaypointPanelOpen,
      setLegendExpanded: state.setLegendExpanded,
      toggleFilterPanel: state.toggleFilterPanel,
      toggleWaypointPanel: state.toggleWaypointPanel,
      toggleLegend: state.toggleLegend,
    }))
  );

export const usePreferenceState = () =>
  useAppStore(
    useShallow((state) => ({
      roadPreferences: state.roadPreferences,
      toggleTypePreference: state.toggleTypePreference,
      toggleSurfacePreference: state.toggleSurfacePreference,
      setRoadPreferences: state.setRoadPreferences,
      resetPreferences: state.resetPreferences,
    }))
  );
