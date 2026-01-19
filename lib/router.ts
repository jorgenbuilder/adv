/**
 * Client-side routing using Dijkstra's algorithm
 *
 * This module provides pathfinding on the pre-built road graph.
 */

import type { LatLng, GraphNode, GraphEdge } from '@/types';
import { ASSET_PATHS } from './constants';

/**
 * Graph structure loaded from JSON
 */
export interface RoutingGraph {
  nodes: Record<string, GraphNode>;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    generatedAt: string;
  };
}

/**
 * Result of a routing query
 */
export interface RouteResult {
  path: LatLng[];
  distance: number; // Total distance in meters
  nodeIds: string[]; // IDs of nodes along the path
}

// Cached graph instance
let graphCache: RoutingGraph | null = null;
let graphLoadPromise: Promise<RoutingGraph | null> | null = null;

/**
 * Load the routing graph from the static JSON file
 * Returns null if the graph file is not available
 */
export async function loadGraph(): Promise<RoutingGraph | null> {
  // Return cached graph if available
  if (graphCache) {
    return graphCache;
  }

  // Return existing promise if already loading
  if (graphLoadPromise) {
    return graphLoadPromise;
  }

  // Start loading
  graphLoadPromise = (async () => {
    try {
      const response = await fetch(ASSET_PATHS.routingGraph);
      if (!response.ok) {
        console.warn(`Routing graph not available: ${response.status}`);
        return null;
      }
      const graph = (await response.json()) as RoutingGraph;
      graphCache = graph;
      console.log(
        `Loaded routing graph: ${graph.metadata.nodeCount} nodes, ${graph.metadata.edgeCount} edges`
      );
      return graph;
    } catch (error) {
      console.warn('Failed to load routing graph:', error);
      return null;
    }
  })();

  return graphLoadPromise;
}

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find the nearest graph node to a given position
 */
export function findNearestNode(
  graph: RoutingGraph,
  position: LatLng
): GraphNode | null {
  let nearestNode: GraphNode | null = null;
  let nearestDistance = Infinity;

  for (const node of Object.values(graph.nodes)) {
    const distance = haversineDistance(position, node.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestNode = node;
    }
  }

  return nearestNode;
}

/**
 * Priority queue implementation for Dijkstra's algorithm
 */
class PriorityQueue<T> {
  private items: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

/**
 * Find the shortest path between two nodes using Dijkstra's algorithm
 */
export function dijkstra(
  graph: RoutingGraph,
  startNodeId: string,
  endNodeId: string
): RouteResult | null {
  const distances: Record<string, number> = {};
  const previous: Record<string, string | null> = {};
  const visited: Set<string> = new Set();
  const queue = new PriorityQueue<string>();

  // Initialize distances
  for (const nodeId of Object.keys(graph.nodes)) {
    distances[nodeId] = nodeId === startNodeId ? 0 : Infinity;
    previous[nodeId] = null;
  }

  queue.enqueue(startNodeId, 0);

  while (!queue.isEmpty()) {
    const currentId = queue.dequeue()!;

    if (visited.has(currentId)) {
      continue;
    }
    visited.add(currentId);

    // Found the target
    if (currentId === endNodeId) {
      break;
    }

    const currentNode = graph.nodes[currentId];
    if (!currentNode) continue;

    // Check all neighbors
    for (const edge of currentNode.edges) {
      if (visited.has(edge.targetNodeId)) {
        continue;
      }

      const newDistance = distances[currentId] + edge.weight;

      if (newDistance < distances[edge.targetNodeId]) {
        distances[edge.targetNodeId] = newDistance;
        previous[edge.targetNodeId] = currentId;
        queue.enqueue(edge.targetNodeId, newDistance);
      }
    }
  }

  // Check if path exists
  if (distances[endNodeId] === Infinity) {
    return null;
  }

  // Reconstruct path
  const nodeIds: string[] = [];
  let current: string | null = endNodeId;

  while (current !== null) {
    nodeIds.unshift(current);
    current = previous[current];
  }

  // Build path coordinates
  const path: LatLng[] = nodeIds.map((id) => graph.nodes[id].position);

  return {
    path,
    distance: distances[endNodeId],
    nodeIds,
  };
}

/**
 * Calculate a route through multiple waypoints
 */
export async function calculateRoute(
  waypoints: LatLng[]
): Promise<RouteResult | null> {
  if (waypoints.length < 2) {
    return null;
  }

  const graph = await loadGraph();
  if (!graph) {
    // No graph available - return straight line path
    return {
      path: [...waypoints],
      distance: calculateStraightLineDistance(waypoints),
      nodeIds: [],
    };
  }

  // Find nearest nodes for each waypoint
  const waypointNodes = waypoints.map((wp) => findNearestNode(graph, wp));

  // Check if all waypoints have corresponding nodes
  if (waypointNodes.some((n) => n === null)) {
    // Some waypoints are too far from the road network
    return {
      path: [...waypoints],
      distance: calculateStraightLineDistance(waypoints),
      nodeIds: [],
    };
  }

  // Calculate route between consecutive waypoints
  const fullPath: LatLng[] = [];
  const allNodeIds: string[] = [];
  let totalDistance = 0;

  for (let i = 0; i < waypointNodes.length - 1; i++) {
    const startNode = waypointNodes[i]!;
    const endNode = waypointNodes[i + 1]!;

    const segment = dijkstra(graph, startNode.id, endNode.id);

    if (!segment) {
      // No path found between these waypoints - use straight line
      if (fullPath.length === 0 || !positionsEqual(fullPath[fullPath.length - 1], startNode.position)) {
        fullPath.push(startNode.position);
      }
      fullPath.push(endNode.position);
      totalDistance += haversineDistance(startNode.position, endNode.position);
      continue;
    }

    // Add segment path (skip first point if it duplicates the previous endpoint)
    const startIndex =
      fullPath.length > 0 && positionsEqual(fullPath[fullPath.length - 1], segment.path[0])
        ? 1
        : 0;

    fullPath.push(...segment.path.slice(startIndex));
    totalDistance += segment.distance;

    // Add node IDs (skip first if duplicate)
    const nodeStartIndex =
      allNodeIds.length > 0 && allNodeIds[allNodeIds.length - 1] === segment.nodeIds[0]
        ? 1
        : 0;
    allNodeIds.push(...segment.nodeIds.slice(nodeStartIndex));
  }

  return {
    path: fullPath,
    distance: totalDistance,
    nodeIds: allNodeIds,
  };
}

/**
 * Calculate straight-line distance through waypoints
 */
function calculateStraightLineDistance(waypoints: LatLng[]): number {
  let distance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    distance += haversineDistance(waypoints[i - 1], waypoints[i]);
  }
  return distance;
}

/**
 * Check if two positions are equal (within tolerance)
 */
function positionsEqual(p1: LatLng, p2: LatLng): boolean {
  return Math.abs(p1.lat - p2.lat) < 0.00001 && Math.abs(p1.lng - p2.lng) < 0.00001;
}

/**
 * Snap a position to the nearest point on the road network
 */
export async function snapToRoad(position: LatLng): Promise<LatLng> {
  const graph = await loadGraph();
  if (!graph) {
    return position;
  }

  const nearestNode = findNearestNode(graph, position);
  if (!nearestNode) {
    return position;
  }

  // Only snap if within reasonable distance (500m)
  const distance = haversineDistance(position, nearestNode.position);
  if (distance > 500) {
    return position;
  }

  return nearestNode.position;
}
