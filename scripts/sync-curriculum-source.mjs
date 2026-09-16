import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'sources', 'curriculum', 'bbb-parallel-lines.manifest.json');
const outputPath = path.join(root, 'src', 'content', 'generated', 'curriculum-source.json');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const [owner, repo] = manifest.sourceRepository.split('/');
const commit = manifest.sourceCommit;

const rawUrl = (filePath) =>
  `https://raw.githubusercontent.com/${owner}/${repo}/${commit}/${filePath.split('/').map(encodeURIComponent).join('/')}`;

const gitBlobSha = (buffer) => {
  const header = Buffer.from(`blob ${buffer.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex');
};

const fetchPinned = async (filePath, expectedSha) => {
  const response = await fetch(rawUrl(filePath));
  if (!response.ok) throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const actualSha = gitBlobSha(buffer);
  if (actualSha !== expectedSha) {
    throw new Error(`Source drift detected for ${filePath}: expected ${expectedSha}, got ${actualSha}`);
  }
  return buffer;
};

const normalizeNewlines = (text) => text.replace(/\r\n/g, '\n');

const sectionSlice = (source, title) => {
  const marker = `W.SECTION("${title}"`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Section not found: ${title}`);
  const nextSection = source.indexOf('W.SECTION("', start + marker.length);
  const endSec = source.indexOf('W.ENDSEC()', start + marker.length);
  const candidates = [nextSection, endSec].filter((x) => x >= 0);
  const end = candidates.length ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

const questionBlock = (section, number) => {
  const marker = `W.Q(${number},`;
  const start = section.indexOf(marker);
  if (start < 0) throw new Error(`Question ${number} not found in selected section`);

  const after = start + marker.length;
  const nextQuestion = section.indexOf('\n\n    W.Q(', after);
  const nextComment = section.indexOf('\n\n    #', after);
  const candidates = [nextQuestion, nextComment].filter((x) => x >= 0);
  const end = candidates.length ? Math.min(...candidates) : section.length;
  return section.slice(start, end).trimEnd();
};

const sourceCache = new Map();
for (const fileRecord of manifest.sourceFiles) {
  if (!fileRecord.path.startsWith('geometry8/topics/')) continue;
  const buffer = await fetchPinned(fileRecord.path, fileRecord.blobSha);
  sourceCache.set(fileRecord.path, normalizeNewlines(buffer.toString('utf8')));
}

const blocks = manifest.blocks.map((block) => {
  const source = sourceCache.get(block.file);
  if (!source) throw new Error(`Source file not loaded: ${block.file}`);
  const section = sectionSlice(source, block.section);
  const rawSource = questionBlock(section, block.question);
  return {
    ...block,
    rawSource,
    rawSourceSha256: crypto.createHash('sha256').update(rawSource, 'utf8').digest('hex'),
  };
});

const visualAssets = [];
for (const asset of manifest.visualAssets ?? []) {
  await fetchPinned(asset.path, asset.blobSha);
  visualAssets.push({
    ...asset,
    pinnedRawUrl: rawUrl(asset.path),
  });
}

const generated = {
  generatedFrom: {
    repository: manifest.sourceRepository,
    commit,
    mode: manifest.mode,
  },
  immutable: true,
  blockCount: blocks.length,
  blocks,
  visualAssets,
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
console.log(`curriculum-source: synced ${blocks.length} verbatim blocks from ${manifest.sourceRepository}@${commit}`);
