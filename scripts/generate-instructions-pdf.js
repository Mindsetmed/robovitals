const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distHtmlPath = path.join(projectRoot, 'dist', 'mindset-sdk', 'browser', 'instructions', 'user-manual.html');
const sourceHtmlPath = path.join(projectRoot, 'public', 'instructions', 'user-manual.html');
const htmlPath = fs.existsSync(distHtmlPath) ? distHtmlPath : sourceHtmlPath;
const pdfPath = path.join(projectRoot, 'public', 'instructions', 'user-manual.pdf');
const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

const browserCandidates = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);

function findBrowser() {
  for (const candidate of browserCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error(`Manual HTML not found: ${htmlPath}`);
    process.exit(1);
  }

  const browser = findBrowser();
  if (!browser) {
    console.warn('No Edge/Chrome found. Open public/instructions/user-manual.html and use Print → Save as PDF.');
    process.exit(0);
  }

  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath);
  }

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--print-to-pdf=${pdfPath}`,
    '--print-to-pdf-no-header',
    fileUrl,
  ];

  const result = spawnSync(browser, args, { stdio: 'inherit' });
  if (result.status !== 0 || !fs.existsSync(pdfPath)) {
    console.error('PDF generation failed. Use Print → Save as PDF from the HTML manual instead.');
    process.exit(result.status || 1);
  }

  console.log(`Generated: ${pdfPath}`);
}

main();
