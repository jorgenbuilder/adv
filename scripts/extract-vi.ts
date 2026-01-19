/**
 * Extract Vancouver Island roads from DRA geodatabase
 *
 * This script clips the DRA data to the Vancouver Island bounding box
 * and converts it to GeoJSON format, preserving key attributes.
 *
 * Prerequisites:
 * - GDAL must be installed (provides ogr2ogr command)
 *   Install on Ubuntu/Debian: sudo apt-get install gdal-bin
 *   Install on macOS: brew install gdal
 *
 * Usage: npx tsx scripts/extract-vi.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Vancouver Island bounding box (from SPEC.md)
const BOUNDS = {
  west: -128.5,
  east: -123.3,
  south: 48.3,
  north: 50.8,
};

// File paths
const DATA_DIR = path.join(process.cwd(), 'data');
const GDB_PATH = path.join(DATA_DIR, 'dgtl_road_atlas.gdb');
const OUTPUT_GEOJSON = path.join(DATA_DIR, 'vi-roads.geojson');

// Attributes to preserve from DRA (based on SPEC.md)
const ATTRIBUTES = [
  'ROAD_CLASS',
  'ROAD_SURFACE',
  'NUM_LANES',
  'ROAD_NAME_FULL', // Full road name
  'ROAD_NAME_ALIAS1',
  'ROAD_NAME_ALIAS2',
  'ROAD_NAME_ALIAS3',
  'SEGMENT_LENGTH_2D',
  'SPEED_LIMIT',
  'ACCESS_RESTRICTION_IND',
];

function checkPrerequisites(): void {
  // Check for ogr2ogr
  try {
    execSync('ogr2ogr --version', { stdio: 'pipe' });
    console.log('Found ogr2ogr (GDAL)');
  } catch {
    console.error('Error: ogr2ogr not found. Please install GDAL.');
    console.error('  Ubuntu/Debian: sudo apt-get install gdal-bin');
    console.error('  macOS: brew install gdal');
    process.exit(1);
  }

  // Check for input geodatabase
  if (!fs.existsSync(GDB_PATH)) {
    console.error(`Error: Geodatabase not found at: ${GDB_PATH}`);
    console.error('Please run the download script first:');
    console.error('  npx tsx scripts/download-dra.ts');
    process.exit(1);
  }
}

function listLayers(): string[] {
  console.log('Listing layers in geodatabase...');
  try {
    const output = execSync(`ogrinfo -so "${GDB_PATH}"`, { encoding: 'utf-8' });
    console.log(output);

    // Parse layer names from output
    const layers = output
      .split('\n')
      .filter((line) => line.match(/^\d+:/))
      .map((line) => line.replace(/^\d+:\s*/, '').split(' ')[0]);

    return layers;
  } catch (error) {
    console.error('Failed to list layers:', error);
    return [];
  }
}

function extractVancouverIsland(): void {
  console.log('');
  console.log('Extracting Vancouver Island roads...');
  console.log(`Bounding box: ${BOUNDS.west}, ${BOUNDS.south}, ${BOUNDS.east}, ${BOUNDS.north}`);
  console.log(`Output: ${OUTPUT_GEOJSON}`);
  console.log('');

  // The main road layer in DRA is typically "TRANSPORT_LINE"
  // We may need to adjust based on actual layer name
  const roadLayer = 'TRANSPORT_LINE';

  // Build ogr2ogr command
  // -f GeoJSON: output format
  // -spat: spatial filter (bounding box)
  // -select: attributes to include
  // -t_srs: transform to WGS84
  const selectFields = ATTRIBUTES.join(',');

  const command = [
    'ogr2ogr',
    '-f GeoJSON',
    `"${OUTPUT_GEOJSON}"`,
    `"${GDB_PATH}"`,
    roadLayer,
    `-spat ${BOUNDS.west} ${BOUNDS.south} ${BOUNDS.east} ${BOUNDS.north}`,
    '-t_srs EPSG:4326',
    `-select "${selectFields}"`,
    '-progress',
  ].join(' ');

  console.log('Running command:');
  console.log(command);
  console.log('');

  try {
    execSync(command, { stdio: 'inherit' });
    console.log('');
    console.log('Extraction complete!');
  } catch (error) {
    console.error('');
    console.error('Extraction failed. The layer name might be different.');
    console.error('Check the layer list above and adjust the script.');
    console.error('Common DRA layer names: TRANSPORT_LINE, DRA_DGTL_ROAD_ATLAS_MPAR_SP');
    throw error;
  }
}

function validateOutput(): void {
  if (!fs.existsSync(OUTPUT_GEOJSON)) {
    console.error('Error: Output file not created');
    process.exit(1);
  }

  const stats = fs.statSync(OUTPUT_GEOJSON);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('');
  console.log('Output file stats:');
  console.log(`  Path: ${OUTPUT_GEOJSON}`);
  console.log(`  Size: ${sizeMB} MB`);

  // Count features (basic validation)
  try {
    const output = execSync(`ogrinfo -so "${OUTPUT_GEOJSON}" -al`, {
      encoding: 'utf-8',
    });
    const featureMatch = output.match(/Feature Count: (\d+)/);
    if (featureMatch) {
      console.log(`  Features: ${featureMatch[1]}`);
    }
  } catch {
    console.log('  (Could not count features)');
  }

  console.log('');
  console.log('Next step: Generate PMTiles from the GeoJSON:');
  console.log('  npx tsx scripts/generate-tiles.ts');
}

async function main() {
  console.log('========================================');
  console.log('Vancouver Island Road Extractor');
  console.log('========================================');
  console.log('');

  // Check prerequisites
  checkPrerequisites();

  // List available layers for reference
  const layers = listLayers();
  console.log('Available layers:', layers.length > 0 ? layers.join(', ') : '(none found)');

  // Extract Vancouver Island roads
  extractVancouverIsland();

  // Validate output
  validateOutput();
}

main().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
