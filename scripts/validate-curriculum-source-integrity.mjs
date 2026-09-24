import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'sources', 'curriculum', 'bbb-parallel-lines.manifest.json');
const unitPlanPath = path.join(root, 'src', 'content', 'unit-plan.json');

const fail = (message) => {
  console.error(`curriculum-source-integrity: FAIL — ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(manifestPath)) {
  fail('curriculum manifest is missing');
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (manifest.sourceRepository !== 'yanivmizrachiy/bbb') fail('unexpected source repository');
  if (manifest.sourceCommit !== '72806f302bc1cd956ac733fefb403eb0a7252330') fail('source commit must remain pinned');
  if (manifest.mode !== 'verbatim') fail('curriculum mode must be verbatim');
  if (manifest.identifiedQuestionBlocks !== 8) fail('expected exactly 8 identified source blocks');
  if ((manifest.blocks ?? []).length !== 8) fail('manifest must contain exactly 8 source blocks');

  const ids = new Set((manifest.blocks ?? []).map((b) => b.id));
  if (ids.size !== 8) fail('source block ids must be unique');

  for (const [key, value] of Object.entries(manifest.mutationPolicy ?? {})) {
    if (key === 'technicalRenderingAdaptation') continue;
    if (value !== 'forbidden') fail(`mutation policy ${key} must be forbidden`);
  }

  const requiredSourceFiles = new Map([
    ['geometry8/topics/t02_angles.py', '7902f00caa849e5e43f7d91c3c8ffb0debe3e25b'],
    ['geometry8/topics/t03_congruence.py', '0b1261cd29ad905aaf46c9a5db6b6f632823708e'],
    ['geometry8/geo.py', '9cec633fac83cb07a09c6b7ff5154142576f4f0a'],
  ]);

  for (const [sourcePath, sha] of requiredSourceFiles) {
    const record = (manifest.sourceFiles ?? []).find((item) => item.path === sourcePath);
    if (!record) fail(`missing source file record: ${sourcePath}`);
    else if (record.blobSha !== sha) fail(`source blob sha changed: ${sourcePath}`);
  }

  const requiredAssets = new Map([
    ['geometry8/assets/t2_iron.png', '025305409007128e4f77880c12b391bba1fbd1ed'],
    ['geometry8/assets/t2_picnic.png', '79c1ed366a51b1157ae0295977b01ec6aecb5c9e'],
  ]);

  for (const [assetPath, sha] of requiredAssets) {
    const record = (manifest.visualAssets ?? []).find((item) => item.path === assetPath);
    if (!record) fail(`missing visual asset record: ${assetPath}`);
    else if (record.blobSha !== sha) fail(`asset blob sha changed: ${assetPath}`);
  }
}

if (!fs.existsSync(unitPlanPath)) {
  fail('unit plan is missing');
} else {
  const plan = JSON.parse(fs.readFileSync(unitPlanPath, 'utf8'));
  const unit5 = (plan.units ?? []).find((unit) => unit.unit === 5);
  if (!unit5) fail('curriculum unit 5 is missing');
  else {
    if (unit5.title !== 'שאלות מתוך תוכנית הלימודים') fail('curriculum unit title mismatch');
    if (unit5.sourceMode !== 'verbatim') fail('curriculum unit must use verbatim source mode');
    if (unit5.sourceRepository !== 'yanivmizrachiy/bbb') fail('curriculum unit source repository mismatch');
    if (unit5.contentMutation !== 'forbidden') fail('curriculum content mutation must be forbidden');
    if (unit5.wordingMutation !== 'forbidden') fail('curriculum wording mutation must be forbidden');
    if (unit5.numberMutation !== 'forbidden') fail('curriculum number mutation must be forbidden');
    if (unit5.labelMutation !== 'forbidden') fail('curriculum label mutation must be forbidden');
    if (unit5.diagramMutation !== 'forbidden') fail('curriculum diagram mutation must be forbidden');
    if (unit5.identifiedQuestionBlocks !== 8) fail('curriculum unit must expose 8 source blocks');
  }
}

if (!process.exitCode) {
  console.log('curriculum-source-integrity: PASS');
}
