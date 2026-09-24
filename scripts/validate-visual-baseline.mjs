import fs from 'node:fs/promises';
import path from 'node:path';
import { baselineDrift, reportHealthIssues } from './lib/visual-baseline-contract.mjs';

const root = process.cwd();
const baselinePath = path.join(root, 'qa', 'visual-baseline.json');
const currentPath = path.join(root, 'artifacts', 'layout-report.json');

const [baseline, current] = await Promise.all([
  fs.readFile(baselinePath, 'utf8').then(JSON.parse),
  fs.readFile(currentPath, 'utf8').then(JSON.parse),
]);

const fail = (message) => {
  throw new Error(`visual-baseline: ${message}`);
};

// 1. The current render must be healthy on its own: no clipping/overflow past the content
//    area, no geometry collisions, no header/footer overlap, complete MathJax.
const health = reportHealthIssues(current);
if (health.length) {
  console.error(health.join('\n'));
  fail(`${health.length} layout health problem(s) in the current render`);
}

// 2. It must match the committed canonical baseline (structure exactly, layout within tolerance).
const drift = baselineDrift(baseline, current);
if (drift.length) {
  console.error(drift.join('\n'));
  fail(
    `${drift.length} visual baseline difference(s) detected — if every change is intended, ` +
      'review it and run: npm run qa:rebaseline -- --accept',
  );
}

console.log(
  `visual-baseline: PASS — ${current.pageCount} pages healthy and matching the canonical structural baseline within bounded layout tolerances`,
);
