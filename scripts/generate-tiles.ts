/**
 * Generate PMTiles from GeoJSON
 *
 * This script converts the Vancouver Island roads GeoJSON
 * to PMTiles format for efficient vector tile serving.
 *
 * Prerequisites:
 * - tippecanoe must be installed
 *   Install on Ubuntu: sudo apt-get install tippecanoe
 *   Install on macOS: brew install tippecanoe
 *   Or build from source: https://github.com/felt/tippecanoe
 *
 * Usage: npx tsx scripts/generate-tiles.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// File paths
const DATA_DIR = path.join(process.cwd(), 'data');
const INPUT_GEOJSON = path.join(DATA_DIR, 'vi-roads.geojson');
const OUTPUT_PMTILES = path.join(process.cwd(), 'public', 'vi-roads.pmtiles');

// Tippecanoe settings for road data
// Optimized for displaying roads at various zoom levels
const TIPPECANOE_OPTIONS = {
  minZoom: 6,
  maxZoom: 14,
  layerName: 'roads',
};

function checkPrerequisites(): void {
  // Check for tippecanoe
  try {
    const version = execSync('tippecanoe --version 2>&1', { encoding: 'utf-8' });
    console.log('Found tippecanoe:', version.trim());
  } catch {
    console.error('Error: tippecanoe not found. Please install it.');
    console.error('  Ubuntu: sudo apt-get install tippecanoe');
    console.error('  macOS: brew install tippecanoe');
    console.error('  Or build from source: https://github.com/felt/tippecanoe');
    process.exit(1);
  }

  // Check for input GeoJSON
  if (!fs.existsSync(INPUT_GEOJSON)) {
    console.error(`Error: Input GeoJSON not found at: ${INPUT_GEOJSON}`);
    console.error('Please run the extraction script first:');
    console.error('  npx tsx scripts/extract-vi.ts');
    process.exit(1);
  }
}

function generatePMTiles(): void {
  console.log('');
  console.log('Generating PMTiles...');
  console.log(`Input: ${INPUT_GEOJSON}`);
  console.log(`Output: ${OUTPUT_PMTILES}`);
  console.log(`Zoom levels: ${TIPPECANOE_OPTIONS.minZoom}-${TIPPECANOE_OPTIONS.maxZoom}`);
  console.log('');

  // Ensure public directory exists
  const publicDir = path.dirname(OUTPUT_PMTILES);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Build tippecanoe command
  // Options:
  // -o: output file
  // -Z: minimum zoom level
  // -z: maximum zoom level
  // -l: layer name
  // --drop-densest-as-needed: drop features to avoid tile size limits
  // --extend-zooms-if-still-dropping: extend zoom if needed
  // --force: overwrite existing file
  // --read-parallel: parallel reading for speed
  const command = [
    'tippecanoe',
    `-o "${OUTPUT_PMTILES}"`,
    `-Z ${TIPPECANOE_OPTIONS.minZoom}`,
    `-z ${TIPPECANOE_OPTIONS.maxZoom}`,
    `-l ${TIPPECANOE_OPTIONS.layerName}`,
    '--drop-densest-as-needed',
    '--extend-zooms-if-still-dropping',
    '--force',
    '--read-parallel',
    `"${INPUT_GEOJSON}"`,
  ].join(' ');

  console.log('Running command:');
  console.log(command);
  console.log('');

  try {
    execSync(command, { stdio: 'inherit' });
    console.log('');
    console.log('PMTiles generation complete!');
  } catch (error) {
    console.error('Failed to generate PMTiles:', error);
    throw error;
  }
}

function validateOutput(): void {
  if (!fs.existsSync(OUTPUT_PMTILES)) {
    console.error('Error: Output file not created');
    process.exit(1);
  }

  const stats = fs.statSync(OUTPUT_PMTILES);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('');
  console.log('Output file stats:');
  console.log(`  Path: ${OUTPUT_PMTILES}`);
  console.log(`  Size: ${sizeMB} MB`);
  console.log('');
  console.log('The PMTiles file is now ready for use with MapLibre GL.');
  console.log('');
  console.log('Next step: Build the routing graph:');
  console.log('  npx tsx scripts/build-graph.ts');
}

async function main() {
  console.log('========================================');
  console.log('PMTiles Generator');
  console.log('========================================');
  console.log('');

  // Check prerequisites
  checkPrerequisites();

  // Generate PMTiles
  generatePMTiles();

  // Validate output
  validateOutput();
}

main().catch((error) => {
  console.error('Error:', error.message || error);
  process.exit(1);
});
