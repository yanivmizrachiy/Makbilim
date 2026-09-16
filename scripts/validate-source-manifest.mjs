import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'sources', 'manifest.json');

if (!fs.existsSync(manifestPath)) {
  throw new Error('source-manifest: sources/manifest.json is missing');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const items = Array.isArray(manifest.items) ? manifest.items : [];

if (manifest.sourceCount !== 30) {
  throw new Error(`source-manifest: expected sourceCount=30, got ${manifest.sourceCount}`);
}
if (items.length !== 30) {
  throw new Error(`source-manifest: expected 30 items, got ${items.length}`);
}

const ids = items.map(item => item.id);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) {
  throw new Error(`source-manifest: duplicate Drive IDs: ${[...new Set(duplicateIds)].join(', ')}`);
}

const requiredFields = ['id', 'title', 'mimeType', 'category', 'storageStatus'];
for (const item of items) {
  for (const field of requiredFields) {
    if (!item[field]) throw new Error(`source-manifest: ${item.id ?? 'unknown'} missing ${field}`);
  }
}

const categoryCounts = items.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] ?? 0) + 1;
  return acc;
}, {});

console.log(`source-manifest: PASS — 30 unique sources indexed ${JSON.stringify(categoryCounts)}`);
