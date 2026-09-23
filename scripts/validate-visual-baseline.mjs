import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'qa', 'visual-baseline.json');
const currentPath = path.join(root, 'artifacts', 'layout-report.json');

const [baseline, current] = await Promise.all([
  fs.readFile(baselinePath, 'utf8').then(JSON.parse),
  fs.readFile(currentPath, 'utf8').then(JSON.parse),
]);

const fail = (message) => {
  throw new Error(`visual-regression: ${message}`);
};

if (baseline.pageCount !== 19 || current.pageCount !== 19) {
  fail(`expected 19 pages, baseline=${baseline.pageCount}, current=${current.pageCount}`);
}

for (const key of ['total', 'rendered', 'svgNodes']) {
  if (baseline.mathJaxStatus?.[key] !== current.mathJaxStatus?.[key]) {
    fail(`MathJax ${key} drift: baseline=${baseline.mathJaxStatus?.[key]}, current=${current.mathJaxStatus?.[key]}`);
  }
}

const exactKeys = [
  'unit',
  'localPage',
  'isVerbatimCurriculum',
  'questionCount',
  'markerCount',
  'subpartCount',
  'subpartMarkerCount',
  'sourceNumberCount',
  'sourceShaCount',
  'geometrySvgCount',
  'unlabeledGeometrySvgCount',
  'geometryCollisionCount',
  'geometryOutOfBoundsCount',
  'projectTitleText',
  'unitTitleText',
  'pageNumberText',
  'headerContentOverlap',
  'footerContentOverlap',
];

const tolerances = {
  widthPx: 1,
  heightPx: 1,
  topGapRatio: 0.015,
  bottomGapRatio: 0.02,
  usedSpanRatio: 0.03,
  maxInterQuestionGapRatio: 0.025,
};

const drift = [];
for (let index = 0; index < baseline.layout.length; index += 1) {
  const expected = baseline.layout[index];
  const actual = current.layout[index];
  if (!actual) {
    drift.push(`page index ${index + 1}: missing current page`);
    continue;
  }

  const pageName = `U${expected.unit}-P${expected.localPage}`;

  for (const key of exactKeys) {
    if (JSON.stringify(expected[key]) !== JSON.stringify(actual[key])) {
      drift.push(`${pageName}: ${key} changed from ${JSON.stringify(expected[key])} to ${JSON.stringify(actual[key])}`);
    }
  }

  if (JSON.stringify(expected.footerLines) !== JSON.stringify(actual.footerLines)) {
    drift.push(`${pageName}: footerLines changed`);
  }

  for (const [key, tolerance] of Object.entries(tolerances)) {
    const a = expected[key];
    const b = actual[key];
    if (a == null && b == null) continue;
    if (typeof a !== 'number' || typeof b !== 'number') {
      drift.push(`${pageName}: ${key} type/null drift`);
      continue;
    }
    const delta = Math.abs(a - b);
    if (delta > tolerance) {
      drift.push(`${pageName}: ${key} drift ${delta.toFixed(6)} exceeds ${tolerance} (baseline=${a}, current=${b})`);
    }
  }
}

if (current.layout.length !== baseline.layout.length) {
  drift.push(`layout page count changed: baseline=${baseline.layout.length}, current=${current.layout.length}`);
}

if (drift.length) {
  console.error(drift.join('\n'));
  fail(`${drift.length} visual baseline difference(s) detected`);
}

console.log(
  `visual-regression: PASS — ${current.pageCount} pages match canonical structural baseline within bounded layout tolerances`,
);
