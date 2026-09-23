import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const root = process.cwd();
const execFileAsync = promisify(execFile);
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

const { stdout: trackedStdout } = await execFileAsync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
});
const trackedInputs = trackedStdout
  .split('\0')
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, 'en'));

if (trackedInputs.length < 50) {
  throw new Error(`checksums: tracked input set is unexpectedly small: ${trackedInputs.length}`);
}

const inputs = [];
for (const relativePath of trackedInputs) {
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
  schemaVersion: 3,
  project: 'Makbilim',
  title: 'זוויות בין ישרים מקבילים',
  version: packageJson.version,
  commit: process.env.GITHUB_SHA ?? 'local',
  ref: process.env.GITHUB_REF ?? 'local',
  runId: process.env.GITHUB_RUN_ID ?? null,
  node: process.version,
  aggregateInputSha256,
  trackedFileCount: inputs.length,
  inputs,
  sbom,
  pdfCount: files.length,
  files,
};

await fs.writeFile(
  path.join(root, 'artifacts', 'input-fingerprint.json'),
  JSON.stringify({ schemaVersion: 2, trackedFileCount: inputs.length, aggregateSha256: aggregateInputSha256, inputs }, null, 2) + '\n',
  'utf8',
);

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`checksums: PASS — ${files.length} PDF files hashed; tracked inputs=${inputs.length}, aggregate=${aggregateInputSha256}`);
