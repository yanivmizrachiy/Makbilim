import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'sources', 'curriculum', 'bbb-parallel-lines.manifest.json');
const renderedPath = path.join(root, 'public', 'generated', 'curriculum-rendered.json');

const fail = (message) => {
  console.error(`curriculum-rendered: FAIL — ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(renderedPath)) {
  fail('rendered curriculum file is missing');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const rendered = JSON.parse(fs.readFileSync(renderedPath, 'utf8'));
  const expectedIds = manifest.blocks.map((block) => block.id);
  const actualIds = rendered.blocks?.map((block) => block.id) ?? [];

  if (rendered.immutable !== true) fail('rendered curriculum must be immutable');
  if (rendered.blockCount !== 8 || actualIds.length !== 8) fail('rendered curriculum must contain exactly 8 blocks');
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) fail('rendered block order/ids differ from pinned manifest');
  if (rendered.generatedFrom?.repository !== manifest.sourceRepository) fail('source repository mismatch');
  if (rendered.generatedFrom?.commit !== manifest.sourceCommit) fail('source commit mismatch');

  for (const block of rendered.blocks ?? []) {
    if (typeof block.html !== 'string' || !block.html.includes('class="q"') || !block.html.includes('class="qbody"')) {
      fail(`invalid source HTML wrapper for ${block.id}`);
      continue;
    }
    const actualSha = crypto.createHash('sha256').update(block.html, 'utf8').digest('hex');
    if (actualSha !== block.htmlSha256) fail(`HTML SHA mismatch for ${block.id}`);
  }
}

if (!process.exitCode) console.log('curriculum-rendered: PASS — 8 immutable rendered blocks verified');
