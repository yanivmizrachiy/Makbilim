import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pdfDir = path.join(root, 'artifacts', 'pdf');
const outputPath = path.join(root, 'artifacts', 'SHA256SUMS.txt');
const manifestPath = path.join(root, 'artifacts', 'build-manifest.json');

const names = (await fs.readdir(pdfDir))
  .filter(name => name.toLowerCase().endsWith('.pdf'))
  .sort((a, b) => a.localeCompare(b, 'he'));

if (names.length < 3) {
  throw new Error(`checksums: expected at least 3 PDF artifacts, found ${names.length}`);
}

const files = [];
for (const name of names) {
  const filePath = path.join(pdfDir, name);
  const bytes = await fs.readFile(filePath);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  files.push({ name, bytes: bytes.byteLength, sha256 });
}

await fs.writeFile(
  outputPath,
  files.map(file => `${file.sha256} *pdf/${file.name}`).join('\n') + '\n',
  'utf8',
);

const canonicalInputs = [
  'SPEC.md',
  'package.json',
  'package-lock.json',
  'qa/visual-baseline.json',
  'sources/manifest.json',
  'sources/curriculum/bbb-parallel-lines.manifest.json',
  'src/content/page-manifest.json',
  'src/content/unit-plan.json',
  'src/content/question-plan.json',
  'src/content/questions-unit1.ts',
  'src/content/questions-unit2.ts',
  'src/content/questions-unit3.ts',
  'src/content/questions-unit4.ts',
  'src/content/questions-unit5.ts',
  'src/content/answer-key.ts',
  'src/content/theorems.ts',
];

const inputs = [];
for (const relativePath of canonicalInputs) {
  const bytes = await fs.readFile(path.join(root, relativePath));
  inputs.push({
    path: relativePath,
    bytes: bytes.byteLength,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  });
}

const aggregateInputSha256 = crypto
  .createHash('sha256')
  .update(inputs.map(item => `${item.path}\0${item.sha256}`).join('\n'))
  .digest('hex');

const sbomPath = path.join(root, 'artifacts', 'sbom.cdx.json');
const sbomBytes = await fs.readFile(sbomPath);
const sbom = {
  path: 'artifacts/sbom.cdx.json',
  bytes: sbomBytes.byteLength,
  sha256: crypto.createHash('sha256').update(sbomBytes).digest('hex'),
};

const packageJson = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const manifest = {
  schemaVersion: 2,
  project: 'Makbilim',
  title: 'זוויות בין ישרים מקבילים',
  version: packageJson.version,
  commit: process.env.GITHUB_SHA ?? 'local',
  ref: process.env.GITHUB_REF ?? 'local',
  runId: process.env.GITHUB_RUN_ID ?? null,
  node: process.version,
  aggregateInputSha256,
  inputs,
  sbom,
  pdfCount: files.length,
  files,
};

await fs.writeFile(
  path.join(root, 'artifacts', 'input-fingerprint.json'),
  JSON.stringify({ schemaVersion: 1, aggregateSha256: aggregateInputSha256, inputs }, null, 2) + '\n',
  'utf8',
);

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`checksums: PASS — ${files.length} PDF files hashed; canonical inputs=${inputs.length}, aggregate=${aggregateInputSha256}`);
