const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'dist', 'mindset-sdk', 'browser');

const deployFiles = ['Web.config', 'staticwebapp.config.json'];

if (!fs.existsSync(outputDir)) {
  console.error('Build output not found:', outputDir);
  process.exit(1);
}

for (const fileName of deployFiles) {
  const sourcePath = path.join(projectRoot, fileName);
  const targetPath = path.join(outputDir, fileName);

  if (!fs.existsSync(sourcePath)) {
    console.warn('Skipping missing deploy file:', fileName);
    continue;
  }

  fs.copyFileSync(sourcePath, targetPath);
  console.log('Copied', fileName, '→', targetPath);
}
