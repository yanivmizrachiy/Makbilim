import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const unitPlanPath = path.join(root, 'src', 'content', 'unit-plan.json');
const tokensPath = path.join(root, 'src', 'styles', 'tokens.ts');

const fail = (message) => {
  console.error(`numbering-markers: FAIL — ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(unitPlanPath)) {
  fail('src/content/unit-plan.json is missing');
} else {
  const plan = JSON.parse(fs.readFileSync(unitPlanPath, 'utf8'));
  const n = plan.numbering ?? {};

  if (n.pageNumbering !== 'reset-per-unit') fail('page numbering must reset per unit');
  if (n.firstPageInEveryUnit !== 1) fail('every unit must start at page 1');
  if (n.globalContinuousPageNumbering !== false) fail('global continuous page numbering must be disabled');
  if (n.questionNumbering !== 'none') fail('questions must not be numbered');
  if (n.subpartNumbering !== 'none') fail('subparts must not be numbered or lettered');
  if (n.questionMarker !== '●') fail('question marker must be ●');
  if (n.subpartMarker !== '•') fail('subpart marker must be •');

  for (const unit of plan.units ?? []) {
    if (unit.pageStart !== 1) fail(`unit ${unit.unit} must start at page 1`);
  }
}

if (!fs.existsSync(tokensPath)) {
  fail('src/styles/tokens.ts is missing');
} else {
  const tokens = fs.readFileSync(tokensPath, 'utf8');
  const required = [
    "numbering: 'reset-per-unit'",
    'firstPageInUnit: 1',
    "glyph: '●'",
    "glyph: '•'",
    "numbering: 'none'",
  ];

  for (const fragment of required) {
    if (!tokens.includes(fragment)) fail(`design token contract missing: ${fragment}`);
  }
}

if (!process.exitCode) {
  console.log('numbering-markers: PASS');
}
