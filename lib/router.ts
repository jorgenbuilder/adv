/**
 * Client-side routing using Dijkstra's algorithm
 *
 * This module provides pathfinding on the pre-built road graph.
 */

import type {
  LatLng,
  GraphNode,
  GraphEdge,
  RoadClass,
  RoadClassDistances,
  RoadClassTravelTimes,
  RouteLeg,
  RoadPreferences,
} from '@/types';
import { ASSET_PATHS } from './constants';

/**
 * Baseline travel speeds by road class (km/h)
 * These are reasonable estimates for Vancouver Island roads
 */
export const ROAD_SPEEDS: Record<RoadClass, number> = {
  highway: 100,
  arterial: 80,
  collector: 60,
  local: 50,
  resource: 40,
  decommissioned: 20,
};

/**
 * Create empty road class distances/times record
 */
function createEmptyRoadClassRecord(): RoadClassDistances {
  return {
    highway: 0,
    arterial: 0,
    collector: 0,
    local: 0,
    resource: 0,
    decommissioned: 0,
  };
}

/**
 * Calculate travel time in seconds for a distance on a road class
 */
function calculateTravelTime(distanceMeters: number, roadClass: RoadClass): number {
  const speedKmh = ROAD_SPEEDS[roadClass];
  const speedMps = (speedKmh * 1000) / 3600; // Convert km/h to m/s
  return distanceMeters / speedMps;
}

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
  distanceByRoadClass: RoadClassDistances; // Distance breakdown by road type
  travelTime: number; // Total travel time in seconds
  travelTimeByRoadClass: RoadClassTravelTimes; // Travel time breakdown by road type
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
 * Calculate preference weight modifier for an edge
 *
 * Lower values = more preferred.
 * - If road class is in preferences, multiply by (0.5 + 0.1 * rank)
 *   So rank 1 = 0.6x, rank 2 = 0.7x, etc.
 * - If not in preferences but has entries, multiply by 1.5x
 * - If preferences are empty, no modification (1.0x)
 */
function getPreferenceWeight(
  edge: GraphEdge,
  preferences?: RoadPreferences
): number {
  if (!preferences) {
    return 1.0;
  }

  const roadClass = edge.roadClass || 'local';
  let modifier = 1.0;

  // Apply type preferences
  if (preferences.types.length > 0) {
    const typeIndex = preferences.types.indexOf(roadClass);
    if (typeIndex >= 0) {
      // Preferred type: 0.5 + 0.1 * (rank - 1) = 0.5, 0.6, 0.7, ...
      modifier *= 0.5 + 0.1 * typeIndex;
    } else {
      // Not preferred: penalty
      modifier *= 1.5;
    }
  }

  return modifier;
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
 * Optionally accepts road preferences to bias toward preferred road types
 */
export function dijkstra(
  graph: RoutingGraph,
  startNodeId: string,
  endNodeId: string,
  preferences?: RoadPreferences
): RouteResult | null {
  const distances: Record<string, number> = {};
  const actualDistances: Record<string, number> = {}; // Track real distances (unweighted)
  const previous: Record<string, { nodeId: string; edge: GraphEdge } | null> = {};
  const visited: Set<string> = new Set();
  const queue = new PriorityQueue<string>();

  // Initialize distances
  for (const nodeId of Object.keys(graph.nodes)) {
    distances[nodeId] = nodeId === startNodeId ? 0 : Infinity;
    actualDistances[nodeId] = nodeId === startNodeId ? 0 : Infinity;
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

      // Apply preference weighting to the edge
      const preferenceWeight = getPreferenceWeight(edge, preferences);
      const weightedEdgeWeight = edge.weight * preferenceWeight;
      const newDistance = distances[currentId] + weightedEdgeWeight;
      const newActualDistance = actualDistances[currentId] + edge.weight;

      if (newDistance < distances[edge.targetNodeId]) {
        distances[edge.targetNodeId] = newDistance;
        actualDistances[edge.targetNodeId] = newActualDistance;
        previous[edge.targetNodeId] = { nodeId: currentId, edge };
        queue.enqueue(edge.targetNodeId, newDistance);
      }
    }
  }

  // Check if path exists
  if (distances[endNodeId] === Infinity) {
    return null;
  }

  // Reconstruct path and track road class distances
  const nodeIds: string[] = [];
  const edges: GraphEdge[] = [];
  let current: string | null = endNodeId;

  while (current !== null) {
    nodeIds.unshift(current);
    const prev: { nodeId: string; edge: GraphEdge } | null = previous[current];
    if (prev) {
      edges.unshift(prev.edge);
      current = prev.nodeId;
    } else {
      current = null;
    }
  }

  // Calculate road class breakdown
  const distanceByRoadClass = createEmptyRoadClassRecord();
  const travelTimeByRoadClass = createEmptyRoadClassRecord();

  for (const edge of edges) {
    const roadClass = edge.roadClass || 'local';
    distanceByRoadClass[roadClass] += edge.weight;
    travelTimeByRoadClass[roadClass] += calculateTravelTime(edge.weight, roadClass);
  }

  // Calculate total travel time
  let travelTime = 0;
  for (const roadClass of Object.keys(travelTimeByRoadClass) as RoadClass[]) {
    travelTime += travelTimeByRoadClass[roadClass];
  }

  // Build path coordinates
  const path: LatLng[] = nodeIds.map((id) => graph.nodes[id].position);

  return {
    path,
    distance: actualDistances[endNodeId], // Use actual (unweighted) distance
    nodeIds,
    distanceByRoadClass,
    travelTime,
    travelTimeByRoadClass,
  };
}

/**
 * Extended route result with per-waypoint leg data
 */
export interface ExtendedRouteResult extends RouteResult {
  legs: RouteLeg[];
}

/**
 * Calculate a route through multiple waypoints
 * Optionally accepts road preferences to bias toward preferred road types
 */
export async function calculateRoute(
  waypoints: LatLng[],
  preferences?: RoadPreferences
): Promise<ExtendedRouteResult | null> {
  if (waypoints.length < 2) {
    return null;
  }

  const graph = await loadGraph();
  const emptyDistances = createEmptyRoadClassRecord();
  const emptyTimes = createEmptyRoadClassRecord();

  if (!graph) {
    // No graph available - return straight line path
    const distance = calculateStraightLineDistance(waypoints);
    // Assume local roads for fallback
    const fallbackDistances = { ...emptyDistances, local: distance };
    const fallbackTimes = { ...emptyTimes, local: calculateTravelTime(distance, 'local') };
    return {
      path: [...waypoints],
      distance,
      nodeIds: [],
      distanceByRoadClass: fallbackDistances,
      travelTime: fallbackTimes.local,
      travelTimeByRoadClass: fallbackTimes,
      legs: [],
    };
  }

  // Find nearest nodes for each waypoint
  const waypointNodes = waypoints.map((wp) => findNearestNode(graph, wp));

  // Check if all waypoints have corresponding nodes
  if (waypointNodes.some((n) => n === null)) {
    // Some waypoints are too far from the road network
    const distance = calculateStraightLineDistance(waypoints);
    const fallbackDistances = { ...emptyDistances, local: distance };
    const fallbackTimes = { ...emptyTimes, local: calculateTravelTime(distance, 'local') };
    return {
      path: [...waypoints],
      distance,
      nodeIds: [],
      distanceByRoadClass: fallbackDistances,
      travelTime: fallbackTimes.local,
      travelTimeByRoadClass: fallbackTimes,
      legs: [],
    };
  }

  // Calculate route between consecutive waypoints
  const fullPath: LatLng[] = [];
  const allNodeIds: string[] = [];
  const legs: RouteLeg[] = [];
  let totalDistance = 0;
  const totalDistanceByRoadClass = createEmptyRoadClassRecord();
  const totalTravelTimeByRoadClass = createEmptyRoadClassRecord();

  for (let i = 0; i < waypointNodes.length - 1; i++) {
    const startNode = waypointNodes[i]!;
    const endNode = waypointNodes[i + 1]!;

    const segment = dijkstra(graph, startNode.id, endNode.id, preferences);

    if (!segment) {
      // No path found between these waypoints - use straight line
      if (fullPath.length === 0 || !positionsEqual(fullPath[fullPath.length - 1], startNode.position)) {
        fullPath.push(startNode.position);
      }
      fullPath.push(endNode.position);
      const straightLineDistance = haversineDistance(startNode.position, endNode.position);
      totalDistance += straightLineDistance;

      // Create leg with local road assumption
      const legDistances = { ...emptyDistances, local: straightLineDistance };
      const legTravelTime = calculateTravelTime(straightLineDistance, 'local');
      const legTimes = { ...emptyTimes, local: legTravelTime };

      legs.push({
        fromWaypointIndex: i,
        toWaypointIndex: i + 1,
        distance: straightLineDistance,
        distanceByRoadClass: legDistances,
        travelTime: legTravelTime,
        travelTimeByRoadClass: legTimes,
      });

      totalDistanceByRoadClass.local += straightLineDistance;
      totalTravelTimeByRoadClass.local += legTravelTime;
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

    // Create leg data
    legs.push({
      fromWaypointIndex: i,
      toWaypointIndex: i + 1,
      distance: segment.distance,
      distanceByRoadClass: segment.distanceByRoadClass,
      travelTime: segment.travelTime,
      travelTimeByRoadClass: segment.travelTimeByRoadClass,
    });

    // Accumulate totals
    for (const roadClass of Object.keys(segment.distanceByRoadClass) as RoadClass[]) {
      totalDistanceByRoadClass[roadClass] += segment.distanceByRoadClass[roadClass];
      totalTravelTimeByRoadClass[roadClass] += segment.travelTimeByRoadClass[roadClass];
    }
  }

  // Calculate total travel time
  let totalTravelTime = 0;
  for (const roadClass of Object.keys(totalTravelTimeByRoadClass) as RoadClass[]) {
    totalTravelTime += totalTravelTimeByRoadClass[roadClass];
  }

  return {
    path: fullPath,
    distance: totalDistance,
    nodeIds: allNodeIds,
    distanceByRoadClass: totalDistanceByRoadClass,
    travelTime: totalTravelTime,
    travelTimeByRoadClass: totalTravelTimeByRoadClass,
    legs,
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

/**
 * Find the name of the nearest road to a given position
 * Returns the road name if found within a reasonable distance, otherwise null
 */
export async function findNearestRoadName(position: LatLng): Promise<string | null> {
  const graph = await loadGraph();
  if (!graph) {
    return null;
  }

  const nearestNode = findNearestNode(graph, position);
  if (!nearestNode) {
    return null;
  }

  // Only consider roads within reasonable distance (500m)
  const distance = haversineDistance(position, nearestNode.position);
  if (distance > 500) {
    return null;
  }

  // Look through the edges of the nearest node to find road names
  // Prioritize edges that are closer to the waypoint position
  const edgesWithNames = nearestNode.edges
    .filter(edge => edge.roadName)
    .map(edge => {
      const targetNode = graph.nodes[edge.targetNodeId];
      if (!targetNode) return null;
      // Calculate how close the midpoint of this edge is to the waypoint
      const midpoint = {
        lat: (nearestNode.position.lat + targetNode.position.lat) / 2,
        lng: (nearestNode.position.lng + targetNode.position.lng) / 2,
      };
      return {
        name: edge.roadName!,
        distance: haversineDistance(position, midpoint),
        roadClass: edge.roadClass,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => {
      // Prioritize named roads, then by distance
      // Give preference to major roads (highway, arterial, collector)
      const classOrder: Record<RoadClass, number> = {
        highway: 0,
        arterial: 1,
        collector: 2,
        resource: 3,
        local: 4,
        decommissioned: 5,
      };
      const classA = classOrder[a.roadClass];
      const classB = classOrder[b.roadClass];
      if (classA !== classB) return classA - classB;
      return a.distance - b.distance;
    });

  if (edgesWithNames.length > 0) {
    return edgesWithNames[0].name;
  }

  return null;
}
