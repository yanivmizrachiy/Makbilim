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
  if (n.questionNumbering !== 'none') fail('original units must not number questions');
  if (n.subpartNumbering !== 'none') fail('original units must not number or letter subparts');
  if (n.questionMarker !== '●') fail('question marker must be ●');
  if (n.subpartMarker !== '•') fail('subpart marker must be •');

  const units = plan.units ?? [];
  for (const unit of units) {
    if (unit.pageStart !== 1) fail(`unit ${unit.unit} must start at page 1`);
  }

  const curriculum = units.find((unit) => unit.unit === 5);
  if (!curriculum) {
    fail('unit 5 curriculum source unit is missing');
  } else {
    if (curriculum.title !== 'שאלות מתוך תוכנית הלימודים') fail('unit 5 title mismatch');
    if (curriculum.sourceMode !== 'verbatim') fail('unit 5 must use verbatim source mode');
    if (curriculum.contentMutation !== 'forbidden') fail('unit 5 content mutation must be forbidden');
    if (curriculum.subpartMutation !== undefined && curriculum.subpartMutation !== 'forbidden') {
      fail('unit 5 subpart mutation must be forbidden when specified');
    }
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
