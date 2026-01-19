/**
 * Build routing graph from road network
 *
 * This script creates a routing graph from the road network
 * for client-side Dijkstra's algorithm routing.
 *
 * Usage: npx tsx scripts/build-graph.ts
 */

async function main() {
  console.log('Building routing graph...');
  console.log('');
  console.log('TODO: Implement graph building');
  console.log('- Load vi-roads.geojson');
  console.log('- Build node graph at road intersections');
  console.log('- Create edges with distance weights');
  console.log('- Output to public/vi-graph.json');
}

main().catch(console.error);
