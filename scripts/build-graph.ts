/**
 * Build routing graph from road network
 *
 * This script creates a routing graph from the Vancouver Island road network
 * for client-side Dijkstra's algorithm routing.
 *
 * The graph is built by:
 * 1. Reading the GeoJSON road data
 * 2. Finding intersections (shared endpoints between segments)
 * 3. Creating nodes at intersections
 * 4. Creating edges between nodes with distance weights
 *
 * Usage: npx tsx scripts/build-graph.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// File paths
const DATA_DIR = path.join(process.cwd(), 'data');
const INPUT_GEOJSON = path.join(DATA_DIR, 'vi-roads.geojson');
const OUTPUT_GRAPH = path.join(process.cwd(), 'public', 'vi-graph.json');

// Types for the graph
interface LatLng {
  lat: number;
  lng: number;
}

interface GraphNode {
  id: string;
  position: LatLng;
  edges: GraphEdge[];
}

interface GraphEdge {
  targetNodeId: string;
  roadSegmentId: string;
  weight: number; // Distance in meters
}

interface Graph {
  nodes: Record<string, GraphNode>;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    generatedAt: string;
  };
}

// Precision for coordinate comparison (about 1 meter)
const COORD_PRECISION = 5;

function coordKey(lng: number, lat: number): string {
  // Create a unique key for a coordinate
  return `${lng.toFixed(COORD_PRECISION)},${lat.toFixed(COORD_PRECISION)}`;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Calculate distance between two points in meters
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function lineStringLength(coordinates: number[][]): number {
  let length = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const [lng1, lat1] = coordinates[i - 1];
    const [lng2, lat2] = coordinates[i];
    length += haversineDistance(lat1, lng1, lat2, lng2);
  }
  return length;
}

function buildGraph(geojson: GeoJSON.FeatureCollection): Graph {
  console.log(`Processing ${geojson.features.length} road segments...`);

  // Map of coordinate key to node ID
  const coordToNode: Map<string, string> = new Map();
  // Map of node ID to node data
  const nodes: Record<string, GraphNode> = {};
  // Counter for node IDs
  let nodeIdCounter = 0;

  // First pass: identify all endpoints
  const endpointCounts: Map<string, number> = new Map();

  for (const feature of geojson.features) {
    // Handle both LineString and MultiLineString geometries
    let coordArrays: number[][][];
    if (feature.geometry.type === 'LineString') {
      coordArrays = [feature.geometry.coordinates as number[][]];
    } else if (feature.geometry.type === 'MultiLineString') {
      coordArrays = feature.geometry.coordinates as number[][][];
    } else {
      continue;
    }

    for (const coords of coordArrays) {
      if (coords.length < 2) continue;

      const startKey = coordKey(coords[0][0], coords[0][1]);
      const endKey = coordKey(coords[coords.length - 1][0], coords[coords.length - 1][1]);

      endpointCounts.set(startKey, (endpointCounts.get(startKey) || 0) + 1);
      endpointCounts.set(endKey, (endpointCounts.get(endKey) || 0) + 1);
    }
  }

  // Second pass: create nodes at intersections (endpoints appearing more than once)
  // and all dead ends
  for (const [key, count] of endpointCounts) {
    // Create node if this is an intersection (count > 1) or dead end
    if (count >= 1) {
      const nodeId = `n${nodeIdCounter++}`;
      const [lng, lat] = key.split(',').map(Number);
      coordToNode.set(key, nodeId);
      nodes[nodeId] = {
        id: nodeId,
        position: { lat, lng },
        edges: [],
      };
    }
  }

  console.log(`Created ${Object.keys(nodes).length} nodes`);

  // Third pass: create edges between nodes
  let edgeCount = 0;
  let segmentCounter = 0;

  for (let i = 0; i < geojson.features.length; i++) {
    const feature = geojson.features[i];

    // Handle both LineString and MultiLineString geometries
    let coordArrays: number[][][];
    if (feature.geometry.type === 'LineString') {
      coordArrays = [feature.geometry.coordinates as number[][]];
    } else if (feature.geometry.type === 'MultiLineString') {
      coordArrays = feature.geometry.coordinates as number[][][];
    } else {
      continue;
    }

    for (const coords of coordArrays) {
      if (coords.length < 2) continue;

      const startKey = coordKey(coords[0][0], coords[0][1]);
      const endKey = coordKey(coords[coords.length - 1][0], coords[coords.length - 1][1]);

      const startNodeId = coordToNode.get(startKey);
      const endNodeId = coordToNode.get(endKey);

      if (!startNodeId || !endNodeId) continue;
      if (startNodeId === endNodeId) continue; // Skip loops

      // Calculate segment length
      const length = lineStringLength(coords);
      const segmentId = `s${segmentCounter++}`;

      // Add bidirectional edges
      nodes[startNodeId].edges.push({
        targetNodeId: endNodeId,
        roadSegmentId: segmentId,
        weight: length,
      });

      nodes[endNodeId].edges.push({
        targetNodeId: startNodeId,
        roadSegmentId: segmentId,
        weight: length,
      });

      edgeCount += 2;
    }
  }

  console.log(`Created ${edgeCount} edges`);

  return {
    nodes,
    metadata: {
      nodeCount: Object.keys(nodes).length,
      edgeCount,
      generatedAt: new Date().toISOString(),
    },
  };
}

function checkPrerequisites(): void {
  if (!fs.existsSync(INPUT_GEOJSON)) {
    console.error(`Error: Input GeoJSON not found at: ${INPUT_GEOJSON}`);
    console.error('Please run the extraction script first:');
    console.error('  npx tsx scripts/extract-vi.ts');
    process.exit(1);
  }
}

async function main() {
  console.log('========================================');
  console.log('Routing Graph Builder');
  console.log('========================================');
  console.log('');

  // Check prerequisites
  checkPrerequisites();

  console.log(`Reading: ${INPUT_GEOJSON}`);

  // Read GeoJSON
  const geojsonData = fs.readFileSync(INPUT_GEOJSON, 'utf-8');
  const geojson = JSON.parse(geojsonData) as GeoJSON.FeatureCollection;

  // Build graph
  console.log('');
  const graph = buildGraph(geojson);

  // Ensure public directory exists
  const publicDir = path.dirname(OUTPUT_GRAPH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write graph
  console.log('');
  console.log(`Writing: ${OUTPUT_GRAPH}`);

  fs.writeFileSync(OUTPUT_GRAPH, JSON.stringify(graph, null, 2));

  const stats = fs.statSync(OUTPUT_GRAPH);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('');
  console.log('Graph stats:');
  console.log(`  Nodes: ${graph.metadata.nodeCount}`);
  console.log(`  Edges: ${graph.metadata.edgeCount}`);
  console.log(`  File size: ${sizeMB} MB`);
  console.log('');
  console.log('Done! The routing graph is ready for client-side routing.');
}

main().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
