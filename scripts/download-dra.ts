/**
 * Download DRA geodatabase from BC Data Catalogue
 *
 * This script downloads the BC Digital Road Atlas geodatabase
 * from the BC Data Catalogue for processing.
 *
 * Usage: npx tsx scripts/download-dra.ts
 *
 * The geodatabase contains provincial road data maintained by GeoBC.
 * Source: https://catalogue.data.gov.bc.ca/dataset/digital-road-atlas-dra-master-partially-attributed-roads
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// FTP URL for the Digital Road Atlas geodatabase
// Based on BC Gov official sources
const DRA_FTP_URL =
  'ftp://ftp.geobc.gov.bc.ca/sections/outgoing/bmgs/DRA_Public/dgtl_road_atlas.gdb.zip';

// Output paths
const DATA_DIR = path.join(process.cwd(), 'data');
const ZIP_FILE = path.join(DATA_DIR, 'dgtl_road_atlas.gdb.zip');
const GDB_DIR = path.join(DATA_DIR, 'dgtl_road_atlas.gdb');

async function downloadWithCurl(url: string, output: string): Promise<void> {
  console.log(`Downloading from: ${url}`);
  console.log(`Output: ${output}`);
  console.log('');

  try {
    // Use curl for FTP download with progress
    execSync(`curl -# -o "${output}" "${url}"`, {
      stdio: 'inherit',
    });
    console.log('Download complete!');
  } catch (error) {
    throw new Error(`Failed to download file: ${error}`);
  }
}

async function extractZip(zipPath: string, outputDir: string): Promise<void> {
  console.log(`Extracting: ${zipPath}`);
  console.log(`To: ${outputDir}`);

  try {
    execSync(`unzip -o "${zipPath}" -d "${path.dirname(outputDir)}"`, {
      stdio: 'inherit',
    });
    console.log('Extraction complete!');
  } catch (error) {
    throw new Error(`Failed to extract zip: ${error}`);
  }
}

async function main() {
  console.log('========================================');
  console.log('BC Digital Road Atlas Downloader');
  console.log('========================================');
  console.log('');

  // Create data directory if it doesn't exist
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`Creating data directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Check if already downloaded
  if (fs.existsSync(GDB_DIR)) {
    console.log('Geodatabase already exists at:', GDB_DIR);
    console.log('Delete it manually if you want to re-download.');
    return;
  }

  // Check if zip exists (partial download)
  if (fs.existsSync(ZIP_FILE)) {
    console.log('Zip file found, extracting...');
  } else {
    // Download the geodatabase
    console.log('Downloading BC Digital Road Atlas geodatabase...');
    console.log('This file is approximately 1.5GB and may take a while.');
    console.log('');

    await downloadWithCurl(DRA_FTP_URL, ZIP_FILE);
  }

  // Extract the zip
  console.log('');
  await extractZip(ZIP_FILE, GDB_DIR);

  // Verify extraction
  if (fs.existsSync(GDB_DIR)) {
    console.log('');
    console.log('Success! Geodatabase extracted to:', GDB_DIR);
    console.log('');
    console.log('Next step: Run the extraction script to clip to Vancouver Island:');
    console.log('  npx tsx scripts/extract-vi.ts');
  } else {
    console.error('Error: Extraction failed, geodatabase not found.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
