'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const destDir = path.join(projectRoot, 'src', 'assets', 'mindset-vitals', 'dist');

const sdkDistCandidates = [
  path.join(projectRoot, 'node_modules', '@mindset-vitals', 'web-sdk', 'dist'),
  path.join(projectRoot, 'vendor', 'mindset-vitals-web-sdk', 'dist'),
];

function shouldExcludeFileName(fileName) {
  return fileName.startsWith('index');
}

function resolveSdkDistDir() {
  for (const candidate of sdkDistCandidates) {
    const workerPath = path.join(candidate, 'worker.js');
    if (fs.existsSync(workerPath)) {
      return candidate;
    }
  }

  const searched = sdkDistCandidates.map((p) => `  - ${p}`).join('\n');
  throw new Error(
    [
      'Mindset Vitals Web SDK dist files were not found.',
      'Expected worker.js in one of:',
      searched,
      '',
      'Ensure @mindset-vitals/web-sdk is installed.',
    ].join('\n'),
  );
}

function readSdkVersion() {
  const packagePaths = [
    path.join(projectRoot, 'node_modules', '@mindset-vitals', 'web-sdk', 'package.json'),
    path.join(projectRoot, 'vendor', 'mindset-vitals-web-sdk', 'package.json'),
  ];

  for (const packagePath of packagePaths) {
    if (!fs.existsSync(packagePath)) {
      continue;
    }
    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (pkg && typeof pkg.version === 'string' && pkg.version.length > 0) {
        return pkg.version;
      }
    } catch {}
  }

  return '0.0.0';
}

function patchWorkerCacheBusting(workerPath, sdkVersion) {
  if (!fs.existsSync(workerPath)) {
    return;
  }

  let content = fs.readFileSync(workerPath, 'utf8');
  const cacheBustLiteral = `?v=${sdkVersion}`;
  const cacheBustPatched = content.replace(
    /const l = `\?v=\$\{Date\.now\(\)\}`/g,
    `const l = "${cacheBustLiteral}"`,
  );

  if (cacheBustPatched !== content) {
    content = cacheBustPatched;
    console.log(`Patched worker.js cache bust → stable "${cacheBustLiteral}"`);
  }

  content = patchWorkerParallelModelInit(content);
  content = patchWorkerModelCacheBusting(content, sdkVersion);
  fs.writeFileSync(workerPath, content, 'utf8');
}

function patchWorkerModelCacheBusting(content, sdkVersion) {
  const marker = `selfie_multiclass_256x256.tflite?v=${sdkVersion}`;
  if (content.includes(marker)) {
    return content;
  }

  const suffix = `?v=${sdkVersion}`;
  const patched = content
    .replace(
      /modelAssetPath: `\/\$\{Ke\}\/selfie_multiclass_256x256\.tflite`/g,
      `modelAssetPath: \`/\${Ke}/selfie_multiclass_256x256.tflite${suffix}\``,
    )
    .replace(
      /modelAssetPath: `\/\$\{Ke\}\/blaze_face_short_range\.tflite`/g,
      `modelAssetPath: \`/\${Ke}/blaze_face_short_range.tflite${suffix}\``,
    );

  if (patched !== content) {
    console.log(`Patched worker.js model paths → stable "${suffix}" cache key`);
  }

  return patched;
}

function patchWorkerParallelModelInit(content) {
  const sequentialMarker =
    'a = await oe.createFromOptions(v, {\n' +
    '      baseOptions: {\n' +
    '        modelAssetPath: `/${Ke}/selfie_multiclass_256x256.tflite`,\n' +
    '        delegate: u\n' +
    '      },\n' +
    '      runningMode: e,\n' +
    '      outputCategoryMask: !0,\n' +
    '      outputConfidenceMasks: !1,\n' +
    '      canvas: new OffscreenCanvas(640, 640)\n' +
    '    }), Ge("Image Segmenter created"), o = await _e.createFromOptions(v, {\n' +
    '      baseOptions: {\n' +
    '        modelAssetPath: `/${Ke}/blaze_face_short_range.tflite`,\n' +
    '        delegate: u\n' +
    '      },\n' +
    '      runningMode: e,\n' +
    '      minDetectionConfidence: 0.6,\n' +
    '      canvas: new OffscreenCanvas(640, 640)\n' +
    '    }), Ge("Face Detector created"), console.log(`Mediapipe initialized in ${Date.now() - _} ms`);';

  const parallelReplacement =
    'const _selfieModelPromise = oe.createFromOptions(v, {\n' +
    '      baseOptions: {\n' +
    '        modelAssetPath: `/${Ke}/selfie_multiclass_256x256.tflite`,\n' +
    '        delegate: u\n' +
    '      },\n' +
    '      runningMode: e,\n' +
    '      outputCategoryMask: !0,\n' +
    '      outputConfidenceMasks: !1,\n' +
    '      canvas: new OffscreenCanvas(640, 640)\n' +
    '    });\n' +
    '    const _faceModelPromise = _e.createFromOptions(v, {\n' +
    '      baseOptions: {\n' +
    '        modelAssetPath: `/${Ke}/blaze_face_short_range.tflite`,\n' +
    '        delegate: u\n' +
    '      },\n' +
    '      runningMode: e,\n' +
    '      minDetectionConfidence: 0.6,\n' +
    '      canvas: new OffscreenCanvas(640, 640)\n' +
    '    });\n' +
    '    [a, o] = await Promise.all([_selfieModelPromise, _faceModelPromise]);\n' +
    '    Ge("Image Segmenter created"), Ge("Face Detector created"), console.log(`Mediapipe initialized in ${Date.now() - _} ms`);';

  if (!content.includes(sequentialMarker)) {
    return content;
  }

  console.log('Patched worker.js → parallel MediaPipe model initialization');
  return content.replace(sequentialMarker, parallelReplacement);
}

function patchVitalClientIndex(indexPath) {
  if (!fs.existsSync(indexPath)) {
    return;
  }

  let content = fs.readFileSync(indexPath, 'utf8');
  const signsGuardMarker = 'if (!k) return;';
  const signsHandlerNeedle =
    '}, v = async (k) => {\n' +
    '    const { dataStatus: d } = k, g = Date.now();';
  const signsHandlerReplacement =
    '}, v = async (k) => {\n' +
    '    if (!k) return;\n' +
    '    const { dataStatus: d } = k, g = Date.now();';

  let patched = content;
  if (!content.includes(signsGuardMarker) && content.includes(signsHandlerNeedle)) {
    patched = patched.replace(signsHandlerNeedle, signsHandlerReplacement);
    console.log(`Patched ${indexPath} → guard undefined signsMessage payloads`);
  }

  const dataStatusNeedle = 'H.dataStatus = De(k.dataStatus), e.emit("signsMessage", H)';
  const dataStatusReplacement =
    'H.dataStatus = De(k.dataStatus || []), e.emit("signsMessage", H)';
  if (patched.includes(dataStatusNeedle)) {
    patched = patched.replace(dataStatusNeedle, dataStatusReplacement);
    console.log(`Patched ${indexPath} → default empty signsMessage dataStatus`);
  }

  if (patched !== content) {
    fs.writeFileSync(indexPath, patched, 'utf8');
  }
}

function patchVitalClientIndexes(projectRootDir) {
  const indexPaths = [
    path.join(projectRootDir, 'node_modules', '@mindset-vitals', 'web-sdk', 'dist', 'index.js'),
    path.join(projectRootDir, 'vendor', 'mindset-vitals-web-sdk', 'dist', 'index.js'),
  ];

  for (const indexPath of indexPaths) {
    patchVitalClientIndex(indexPath);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`);
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
      continue;
    }

    if (shouldExcludeFileName(entry.name)) {
      continue;
    }

    fs.copyFileSync(srcPath, destPath);
  }
}

function main() {
  const sourceDir = resolveSdkDistDir();
  const sdkVersion = readSdkVersion();
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  copyDirectory(sourceDir, destDir);
  patchWorkerCacheBusting(path.join(destDir, 'worker.js'), sdkVersion);
  patchVitalClientIndexes(projectRoot);
  console.log(`Mindset Vitals worker files copied from:\n  ${sourceDir}\nto:\n  ${destDir}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
