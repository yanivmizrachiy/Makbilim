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

const manifest = {
  project: 'Makbilim',
  title: 'זוויות בין ישרים מקבילים',
  commit: process.env.GITHUB_SHA ?? 'local',
  node: process.version,
  pdfCount: files.length,
  files,
};

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`checksums: PASS — ${files.length} PDF files hashed with SHA-256`);
