/**
 * Deliberate re-baseline tool:  npm run qa:rebaseline  [-- --accept]
 *
 * Compares the fresh render (artifacts/layout-report.json, written by `npm run pdf:chromium`)
 * with the committed qa/visual-baseline.json and prints every difference.
 *   - Refuses to promote an unhealthy render (overflow, collisions, header/footer overlap,
 *     incomplete MathJax) — a defect must be fixed, never baselined.
 *   - Without --accept it only reports (exit 2), so a re-baseline is always a reviewed decision.
 *   - With --accept it writes the new canonical baseline.
 * Review artifacts/screenshots/ (color / grayscale / forced-colors) before accepting.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { baselineDrift, reportHealthIssues } from './lib/visual-baseline-contract.mjs';

const root = process.cwd();
const baselinePath = path.join(root, 'qa', 'visual-baseline.json');
const currentPath = path.join(root, 'artifacts', 'layout-report.json');
const accept = process.argv.includes('--accept');

const current = JSON.parse(await fs.readFile(currentPath, 'utf8'));
const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));

const health = reportHealthIssues(current);
if (health.length) {
  console.error(`visual-baseline: refusing to re-baseline an unhealthy render (${health.length} problem(s)):`);
  console.error(health.map(line => `  - ${line}`).join('\n'));
  process.exit(1);
}

const drift = baselineDrift(baseline, current);
if (!drift.length) {
  console.log('visual-baseline: the current render already matches the committed baseline — nothing to update.');
  process.exit(0);
}

console.log(`visual-baseline: ${drift.length} difference(s) between the committed baseline and the current render:`);
console.log(drift.map(line => `  - ${line}`).join('\n'));

if (!accept) {
  console.log(
    '\nReview each difference (and artifacts/screenshots/). If every change is intended, run:\n' +
      '  npm run qa:rebaseline -- --accept',
  );
  process.exit(2);
}

const next = {
  pageCount: current.pageCount,
  mathJaxStatus: current.mathJaxStatus,
  layout: current.layout,
};
await fs.writeFile(baselinePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log('visual-baseline: accepted — qa/visual-baseline.json updated from artifacts/layout-report.json');
