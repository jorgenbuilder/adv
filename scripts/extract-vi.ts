/**
 * Extract Vancouver Island roads from DRA geodatabase
 *
 * This script clips the DRA data to the Vancouver Island bounding box
 * and converts it to GeoJSON format.
 *
 * Usage: npx tsx scripts/extract-vi.ts
 */

// Vancouver Island bounding box
const BOUNDS = {
  northwest: { lat: 50.8, lng: -128.5 },
  southeast: { lat: 48.3, lng: -123.3 },
};

async function main() {
  console.log('Extracting Vancouver Island roads...');
  console.log('Bounding box:', JSON.stringify(BOUNDS, null, 2));
  console.log('');
  console.log('TODO: Implement extraction logic');
  console.log('- Read DRA geodatabase');
  console.log('- Filter to bounding box');
  console.log('- Preserve relevant attributes');
  console.log('- Output to data/vi-roads.geojson');
}

main().catch(console.error);
