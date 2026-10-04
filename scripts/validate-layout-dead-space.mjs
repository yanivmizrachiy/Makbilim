import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'artifacts', 'layout-report.json');
const MAX_BLOCK_DEAD_MM = 8;

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
const failures = [];

for (const page of report.layout ?? []) {
  if (page.isVerbatimCurriculum) continue;
  for (const block of page.blocks ?? []) {
    if (typeof block.blockDeadMm !== 'number') {
      failures.push(`${page.pageId}/${block.taskId ?? '?'}: missing blockDeadMm`);
      continue;
    }
    if (block.blockDeadMm > MAX_BLOCK_DEAD_MM) {
      failures.push(
        `${page.pageId}/${block.taskId ?? '?'}: blockDeadMm=${block.blockDeadMm}mm > ${MAX_BLOCK_DEAD_MM}mm`,
      );
    }
  }
}

if (failures.length) {
  console.error('layout-dead-space: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`layout-dead-space: PASS — every authored question block is <= ${MAX_BLOCK_DEAD_MM}mm dead space`);
