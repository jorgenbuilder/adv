# Vancouver Island Adventure Map

A web-based map tool for exploring roads on Vancouver Island and planning motorcycle adventures with shareable, URL-based routes.

## Overview

This application provides:
1. **Interactive Map** - Topographical map with satellite imagery and BC Digital Road Atlas data overlaid, styled by road type
2. **Route Planner** - Waypoint-based routing with road-snapped paths, draggable anchors, and URL state sync for instant sharing

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  NextJS + React + TypeScript                                │
│  ├── MapLibre GL JS (via react-map-gl/maplibre)            │
│  ├── Zustand (state management)                             │
│  ├── shadcn/ui + Tailwind (UI components)                  │
│  └── URL State Sync (nuqs or custom)                        │
├─────────────────────────────────────────────────────────────┤
│                      Static Assets                           │
│  ├── PMTiles (Vancouver Island road vectors)                │
│  ├── Road network graph (routing)                           │
│  └── Hosted on Vercel/CDN                                   │
├─────────────────────────────────────────────────────────────┤
│                    External Services                         │
│  ├── MapTiler API (satellite imagery, terrain)              │
│  └── BC Data Catalogue (source data - build time only)      │
└─────────────────────────────────────────────────────────────┘
```

## Data Pipeline

### Source Data
- **BC Digital Road Atlas (DRA)** - Geodatabase format from BC Data Catalogue
- **Geographic Scope** - Vancouver Island bounding box extraction

### DRA Attributes (Native)
Based on the BC DRA schema, we will use these native attributes for classification:

| Attribute | Description | Use Case |
|-----------|-------------|----------|
| `ROAD_CLASS` | Navigational classification | Primary styling (highway, arterial, collector, local, resource) |
| `ROAD_SURFACE` | Surface type | Filter/style (paved, loose, rough, overgrown, decommissioned) |
| `NUM_LANES` | Number of lanes | Visual weight |
| `ROAD_NAME` | Full road name | Display/search |
| `ROAD_NAME_ALIAS1-3` | Alternate names | Highway numbers, local names |
| `SEGMENT_LENGTH_2D` | Length in meters | Distance calculation |
| `SPEED_LIMIT` | Posted speed | Time estimation (future) |
| `ACCESS_RESTRICTION` | Access codes | Filter private/restricted |

### Processing Pipeline

```
1. Download DRA geodatabase from BC Data Catalogue
2. Extract Vancouver Island extent (bounding box clip)
3. Convert to GeoJSON with attribute preservation
4. Generate PMTiles for vector tile serving
5. Build routing graph from road network
```

### Vancouver Island Bounding Box
```
Northwest: 50.8°N, -128.5°W
Southeast: 48.3°N, -123.3°W
```

## Map Features

### Basemap Layers
1. **Satellite Imagery** - MapTiler satellite style
2. **3D Terrain** - MapTiler terrain-rgb with MapLibre setTerrain()
3. **Road Overlay** - DRA vectors from PMTiles

### Road Styling by Classification

| Road Class | Color | Width | Dash |
|------------|-------|-------|------|
| Highway | `#ff6b35` | 4px | solid |
| Arterial | `#f7c59f` | 3px | solid |
| Collector | `#efefef` | 2px | solid |
| Local | `#a0a0a0` | 1.5px | solid |
| Resource/FSR | `#8b4513` | 2px | dashed |
| Decommissioned | `#666666` | 1px | dotted |

### Road Styling by Surface

| Surface | Modifier |
|---------|----------|
| Paved | Base color |
| Loose (gravel) | 20% lighter + texture |
| Rough | 20% darker |
| Overgrown | 50% opacity |

### Road Filtering
- Toggle visibility by `ROAD_CLASS`
- Toggle visibility by `ROAD_SURFACE`
- Combined filter UI in collapsible panel

## Route Planner

### Core Functionality
1. **Click to add waypoint** - Snaps to nearest road
2. **Drag waypoint** - Re-routes through new position
3. **Add anchor points** - Click on route line to add control point
4. **Remove waypoint** - Click waypoint marker, delete button
5. **Reorder waypoints** - Drag in list or on map

### Routing Engine
- Client-side routing using pre-built road graph
- Dijkstra's algorithm on road network
- Snap waypoints to nearest road segment
- Calculate path between consecutive waypoints

### Distance Calculation
- Sum of all road segment lengths along route
- Display in km with one decimal precision
- Update in real-time as route changes

### URL State Sync
Route state encoded in URL for instant sharing:

```
https://app.com/?w=48.4284,-123.3656,48.5,-123.4,48.6,-123.5&z=10&c=48.5,-123.4
```

| Param | Description |
|-------|-------------|
| `w` | Waypoints as lat,lng pairs |
| `z` | Zoom level |
| `c` | Map center lat,lng |
| `f` | Active filters (bitfield) |

### Share Flow
1. Route automatically syncs to URL as user edits
2. "Share" button copies current URL to clipboard
3. Opening shared URL restores exact map state

## UI/UX

### Layout
```
┌────────────────────────────────────────────────┐
│ [Logo]              [Filters] [Share] [Clear]  │ <- Header
├────────────────────────────────────────────────┤
│                                                │
│                                                │
│                    MAP                         │
│                                                │
│                                                │
│  ┌──────────┐                                  │
│  │ Waypoint │                                  │
│  │ List     │                                  │ <- Collapsible panel
│  │          │                                  │
│  │ Distance │                                  │
│  └──────────┘                                  │
└────────────────────────────────────────────────┘
```

### Mobile Layout
- Full-screen map
- Bottom sheet for waypoint list
- Floating action buttons
- Touch-friendly waypoint interaction

### Desktop Layout
- Sidebar for waypoint management
- Hover states on road segments
- Keyboard shortcuts

### Components (shadcn/ui)
- `Sheet` - Filter panel, waypoint list
- `Button` - Actions
- `Toggle` - Filter switches
- `Card` - Waypoint items
- `Tooltip` - Road info on hover

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| State | Zustand |
| Maps | MapLibre GL JS + react-map-gl |
| Tiles | PMTiles (protomaps) |
| Routing | Custom client-side (Dijkstra) |
| URL State | nuqs or custom |
| Deployment | Vercel |
| Repo | GitHub |

## Data Processing Scripts

### `scripts/download-dra.ts`
Download DRA geodatabase from BC Data Catalogue

### `scripts/extract-vi.ts`
Clip to Vancouver Island bounding box, output GeoJSON

### `scripts/generate-tiles.ts`
Convert GeoJSON to PMTiles using tippecanoe

### `scripts/build-graph.ts`
Build routing graph from road network for client-side routing

## File Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── map/
│   │   ├── Map.tsx
│   │   ├── RoadLayer.tsx
│   │   ├── RouteLayer.tsx
│   │   └── WaypointMarker.tsx
│   ├── ui/              (shadcn)
│   ├── FilterPanel.tsx
│   ├── WaypointList.tsx
│   └── ShareButton.tsx
├── lib/
│   ├── store.ts         (zustand)
│   ├── router.ts        (dijkstra routing)
│   ├── url-state.ts     (sync to URL)
│   └── constants.ts
├── scripts/
│   ├── download-dra.ts
│   ├── extract-vi.ts
│   ├── generate-tiles.ts
│   └── build-graph.ts
├── public/
│   ├── vi-roads.pmtiles
│   └── vi-graph.json
└── types/
    └── index.ts
```

## API Keys & Config

```env
NEXT_PUBLIC_MAPTILER_KEY=sYAwnd93vRv6Nhdo5jge
```

## Performance Considerations

- PMTiles for efficient vector tile loading (no tile server needed)
- Pre-built routing graph loaded on-demand
- Debounced URL updates (avoid history spam)
- Virtualized waypoint list for long routes
- Lazy load filter panel

## Out of Scope (v1)

- User authentication
- Server-side route storage
- Multi-day trip planning
- Turn-by-turn directions
- GPX/KML export
- Elevation profiles
- POI database
- Offline support
