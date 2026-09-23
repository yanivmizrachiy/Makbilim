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

const requiredFields = ['id', 'title', 'mimeType', 'category', 'storageStatus', 'sourceIdType', 'usageMode', 'rightsStatus'];
for (const item of items) {
  for (const field of requiredFields) {
    if (!item[field]) throw new Error(`source-manifest: ${item.id ?? 'unknown'} missing ${field}`);
  }
}


const allowedUsageModes = new Set([
  'external-reference',
  'visual-reference',
  'instructional-reference',
  'worksheet-reference',
  'core-reference',
]);
for (const item of items) {
  if (item.sourceIdType !== 'google-drive-file-id') {
    throw new Error(`source-manifest: ${item.id} has invalid sourceIdType=${item.sourceIdType}`);
  }
  if (!allowedUsageModes.has(item.usageMode)) {
    throw new Error(`source-manifest: ${item.id} has invalid usageMode=${item.usageMode}`);
  }
  if (item.rightsStatus !== 'not-asserted') {
    throw new Error(`source-manifest: ${item.id} must not infer rights; got ${item.rightsStatus}`);
  }
}
if (
  manifest.provenancePolicy?.version !== 1 ||
  manifest.provenancePolicy?.sourceIdType !== 'google-drive-file-id' ||
  manifest.provenancePolicy?.rightsStatusDefault !== 'not-asserted' ||
  manifest.provenancePolicy?.noLicenseInference !== true
) {
  throw new Error('source-manifest: provenancePolicy is missing or unsafe');
}

const categoryCounts = items.reduce((acc, item) => {
  acc[item.category] = (acc[item.category] ?? 0) + 1;
  return acc;
}, {});

console.log(`source-manifest: PASS — 30 unique sources indexed ${JSON.stringify(categoryCounts)}`);
