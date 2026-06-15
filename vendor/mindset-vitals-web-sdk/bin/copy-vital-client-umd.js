#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source: your library's dist folder
const sourceDir = join(__dirname, '../dist');

// Destination: consumer's public folder (configurable via args)
const destDir = process.argv[2] || 'public';

// Recursively copy directory contents
function copyDirectory(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    // Skip excluded files
    if (stat.isFile() && !entry.includes('umd')) {
      continue;
    }

    if (stat.isDirectory()) {
      // Recursively copy subdirectories
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${entry}`);
    }
  }
}

// Start copying
copyDirectory(sourceDir, destDir);
console.log(`\n🎉 All assets copied to ${destDir}`);
