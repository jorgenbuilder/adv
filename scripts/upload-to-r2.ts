#!/usr/bin/env node

/**
 * Upload road atlas assets to Cloudflare R2
 *
 * This script uploads the large static assets to R2 with proper cache headers:
 * - vi-graph.json (70 MB) - Routing graph
 * - vi-roads.pmtiles (58 MB) - Vector tiles
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const BUCKET_NAME = 'vi-road-atlas';

const FILES = [
  {
    localPath: 'public/vi-graph.json',
    remotePath: 'vi-graph.json',
    contentType: 'application/json',
  },
  {
    localPath: 'public/vi-roads.pmtiles',
    remotePath: 'vi-roads.pmtiles',
    contentType: 'application/vnd.pmtiles',
  },
];

// Cache headers: immutable content can be cached for 1 year
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

function uploadFile(file: typeof FILES[0]) {
  console.log(`\nUploading ${file.localPath}...`);

  if (!existsSync(file.localPath)) {
    console.error(`❌ File not found: ${file.localPath}`);
    process.exit(1);
  }

  try {
    const cmd = [
      'npx wrangler r2 object put',
      `${BUCKET_NAME}/${file.remotePath}`,
      `--file="${file.localPath}"`,
      `--content-type="${file.contentType}"`,
      `--cache-control="${CACHE_CONTROL}"`,
      '--remote',
    ].join(' ');

    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ Uploaded ${file.remotePath}`);
  } catch (error) {
    console.error(`❌ Failed to upload ${file.remotePath}:`, error);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting upload to Cloudflare R2...');
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Files to upload: ${FILES.length}`);

  for (const file of FILES) {
    uploadFile(file);
  }

  console.log('\n✨ All files uploaded successfully!');
  console.log('\nNext steps:');
  console.log('1. Enable public access to the R2 bucket via Cloudflare dashboard');
  console.log('2. Get the public R2 URL (*.r2.dev or custom domain)');
  console.log('3. Set NEXT_PUBLIC_R2_BASE_URL in your environment variables');
}

main();
