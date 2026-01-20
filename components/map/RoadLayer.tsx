'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import maplibregl, { FilterSpecification, ExpressionSpecification } from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useFilterState } from '@/lib/store';
import { ASSET_PATHS, ROAD_CLASS_STYLES } from '@/lib/constants';
import type { RoadClass, RoadSurface } from '@/types';

// PMTiles source name
const ROADS_SOURCE = 'vi-roads';
const ROADS_LAYER_PREFIX = 'roads-';

// Map DRA ROAD_CLASS values to our classification
const ROAD_CLASS_MAPPING: Record<string, RoadClass> = {
  highway: 'highway',
  freeway: 'highway',
  ramp: 'highway',
  arterial: 'arterial',
  collector: 'collector',
  local: 'local',
  resource: 'resource',
  recreation: 'resource',
  restricted: 'resource',
  strata: 'local',
  lane: 'local',
  driveway: 'local',
  service: 'local',
  trail: 'decommissioned',
  ferry: 'arterial',
  water: 'local',
  unclassified: 'local',
};

// Map DRA ROAD_SURFACE values to our classification
const ROAD_SURFACE_MAPPING: Record<string, RoadSurface> = {
  paved: 'paved',
  loose: 'loose',
  rough: 'rough',
  overgrown: 'overgrown',
  decommissioned: 'decommissioned',
  unknown: 'loose',
};

// Adjust color brightness
function adjustColor(hex: string, factor: number): string {
  // Remove # if present
  const color = hex.replace('#', '');

  // Parse hex to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Adjust brightness
  const adjust = (value: number) => {
    if (factor > 0) {
      // Lighten: move towards 255
      return Math.round(value + (255 - value) * factor);
    } else {
      // Darken: move towards 0
      return Math.round(value * (1 + factor));
    }
  };

  const newR = Math.min(255, Math.max(0, adjust(r)));
  const newG = Math.min(255, Math.max(0, adjust(g)));
  const newB = Math.min(255, Math.max(0, adjust(b)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Generate line-dasharray for different dash styles
function getDashArray(dash: string): number[] | undefined {
  switch (dash) {
    case 'dashed':
      return [4, 2];
    case 'dotted':
      return [1, 2];
    default:
      return undefined;
  }
}

/**
 * Road overlay layer for displaying DRA road vectors from PMTiles
 *
 * Renders roads styled by:
 * - ROAD_CLASS: highway, arterial, collector, local, resource, decommissioned
 * - ROAD_SURFACE: paved, loose, rough, overgrown
 */
export function RoadLayer() {
  const { current: map } = useMap();
  const protocolRef = useRef<Protocol | null>(null);
  const { roadFilters } = useFilterState();

  // Initialize PMTiles protocol
  useEffect(() => {
    // Add PMTiles protocol if not already added
    if (!protocolRef.current) {
      const protocol = new Protocol();
      protocolRef.current = protocol;

      // Register the protocol with maplibre globally
      // addProtocol is called on maplibregl module, not on map instance
      try {
        maplibregl.addProtocol('pmtiles', protocol.tile);
      } catch {
        // Protocol may already be registered, which is fine
      }
    }

    return () => {
      // Cleanup protocol on unmount
      if (protocolRef.current) {
        try {
          maplibregl.removeProtocol('pmtiles');
        } catch {
          // Ignore errors during cleanup
        }
        protocolRef.current = null;
      }
    };
  }, []);

  // Add road source and layers
  const addRoadLayers = useCallback(() => {
    if (!map) return;

    const maplibre = map.getMap();

    // Check if source already exists
    if (maplibre.getSource(ROADS_SOURCE)) return;

    // Add PMTiles source
    maplibre.addSource(ROADS_SOURCE, {
      type: 'vector',
      url: `pmtiles://${ASSET_PATHS.roadTiles}`,
    });

    // Add layers for each road class (in order from lowest to highest priority)
    const roadClasses: RoadClass[] = [
      'decommissioned',
      'local',
      'resource',
      'collector',
      'arterial',
      'highway',
    ];

    roadClasses.forEach((roadClass) => {
      const style = ROAD_CLASS_STYLES[roadClass];
      const layerId = `${ROADS_LAYER_PREFIX}${roadClass}`;

      // Build the filter for this road class using match expression
      const draClasses = Object.entries(ROAD_CLASS_MAPPING)
        .filter(([, mappedClass]) => mappedClass === roadClass)
        .map(([draClass]) => draClass.toLowerCase());

      // Use match expression for better type compatibility
      const classFilter: FilterSpecification = [
        'match',
        ['downcase', ['get', 'RD_CLASS']] as ExpressionSpecification,
        draClasses,
        true,
        false,
      ];

      maplibre.addLayer({
        id: layerId,
        type: 'line',
        source: ROADS_SOURCE,
        'source-layer': 'roads', // Assumes the layer name in PMTiles is 'roads'
        filter: classFilter,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': [
            'case',
            // Overgrown - use base color with reduced opacity
            ['==', ['downcase', ['coalesce', ['get', 'RD_SURFACE'], 'paved']], 'overgrown'],
            style.color,
            // Rough - darken by 20%
            ['==', ['downcase', ['coalesce', ['get', 'RD_SURFACE'], 'paved']], 'rough'],
            adjustColor(style.color, -0.2),
            // Loose - lighten by 20%
            ['==', ['downcase', ['coalesce', ['get', 'RD_SURFACE'], 'paved']], 'loose'],
            adjustColor(style.color, 0.2),
            // Default (paved) - base color
            style.color,
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, style.width * 0.25,
            10, style.width * 0.5,
            14, style.width,
            18, style.width * 2,
          ],
          'line-opacity': [
            'case',
            // Overgrown or decommissioned surface - 50% opacity
            ['any',
              ['==', ['downcase', ['coalesce', ['get', 'RD_SURFACE'], 'paved']], 'overgrown'],
              ['==', ['downcase', ['coalesce', ['get', 'RD_SURFACE'], 'paved']], 'decommissioned'],
            ],
            0.5,
            // Default - full opacity
            1,
          ],
        },
      });

      // Add dashed overlay for dashed/dotted styles
      if (style.dash !== 'solid') {
        const dashArray = getDashArray(style.dash);
        if (dashArray) {
          maplibre.addLayer({
            id: `${layerId}-dash`,
            type: 'line',
            source: ROADS_SOURCE,
            'source-layer': 'roads',
            filter: classFilter,
            layout: {
              'line-cap': 'butt',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#ffffff',
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, style.width * 0.15,
                10, style.width * 0.3,
                14, style.width * 0.6,
                18, style.width * 1.2,
              ],
              'line-dasharray': dashArray,
              'line-opacity': 0.6,
            },
          });
        }
      }
    });
  }, [map]);

  // Set up layers when map is loaded
  useEffect(() => {
    if (!map) return;

    const maplibre = map.getMap();

    const onStyleLoad = () => {
      addRoadLayers();
    };

    // If style is already loaded, add layers immediately
    if (maplibre.isStyleLoaded()) {
      addRoadLayers();
    } else {
      maplibre.on('style.load', onStyleLoad);
    }

    return () => {
      maplibre.off('style.load', onStyleLoad);
    };
  }, [map, addRoadLayers]);

  // Update layer visibility based on filters
  useEffect(() => {
    if (!map) return;

    const maplibre = map.getMap();

    // Wait for style to load
    if (!maplibre.isStyleLoaded()) return;

    const roadClasses: RoadClass[] = [
      'highway',
      'arterial',
      'collector',
      'local',
      'resource',
      'decommissioned',
    ];

    roadClasses.forEach((roadClass) => {
      const layerId = `${ROADS_LAYER_PREFIX}${roadClass}`;
      const dashLayerId = `${layerId}-dash`;

      // Check if layer exists
      if (!maplibre.getLayer(layerId)) return;

      // Build filter based on road class and surface filters
      const isClassEnabled = roadFilters.roadClass[roadClass];

      // Get all DRA class values that map to this road class
      const draClasses = Object.entries(ROAD_CLASS_MAPPING)
        .filter(([, mappedClass]) => mappedClass === roadClass)
        .map(([draClass]) => draClass.toLowerCase());

      // Get all enabled surface values
      const enabledSurfaces = Object.entries(roadFilters.roadSurface)
        .filter(([, enabled]) => enabled)
        .flatMap(([surface]) =>
          Object.entries(ROAD_SURFACE_MAPPING)
            .filter(([, mappedSurface]) => mappedSurface === surface)
            .map(([draSurface]) => draSurface.toLowerCase())
        );

      if (!isClassEnabled || enabledSurfaces.length === 0) {
        // Hide layer if class is disabled or no surfaces are enabled
        maplibre.setLayoutProperty(layerId, 'visibility', 'none');
        if (maplibre.getLayer(dashLayerId)) {
          maplibre.setLayoutProperty(dashLayerId, 'visibility', 'none');
        }
      } else {
        // Show layer with combined filter
        maplibre.setLayoutProperty(layerId, 'visibility', 'visible');
        if (maplibre.getLayer(dashLayerId)) {
          maplibre.setLayoutProperty(dashLayerId, 'visibility', 'visible');
        }

        // Build combined filter using match expressions
        const combinedFilter: FilterSpecification = [
          'all',
          // Match road class
          [
            'match',
            ['downcase', ['get', 'RD_CLASS']] as ExpressionSpecification,
            draClasses,
            true,
            false,
          ],
          // Match road surface
          [
            'match',
            ['downcase', ['coalesce', ['get', 'RD_SURFACE'], 'paved']] as ExpressionSpecification,
            enabledSurfaces,
            true,
            false,
          ],
        ];

        maplibre.setFilter(layerId, combinedFilter);
        if (maplibre.getLayer(dashLayerId)) {
          maplibre.setFilter(dashLayerId, combinedFilter);
        }
      }
    });
  }, [map, roadFilters]);

  // This component doesn't render anything directly - it manages MapLibre layers
  return null;
}
