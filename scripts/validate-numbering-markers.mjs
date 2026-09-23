import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// continuous-numbering gate (SPEC 4.1/4.2/11.5/11.6): pages and questions are numbered
// continuously 1..N across the whole booklet (no per-unit reset, no "אין מספור, רק ●"),
// sub-parts are lettered, and the curriculum block is first.
const root = process.cwd();
const unitPlanPath = path.join(root, 'src', 'content', 'unit-plan.json');
const tokensPath = path.join(root, 'src', 'styles', 'tokens.ts');
const bookletPath = path.join(root, 'src', 'content', 'booklet.ts');

const fail = (message) => {
  console.error(`continuous-numbering: FAIL — ${message}`);
  process.exitCode = 1;
};

if (!fs.existsSync(unitPlanPath)) {
  fail('src/content/unit-plan.json is missing');
} else {
  const plan = JSON.parse(fs.readFileSync(unitPlanPath, 'utf8'));
  const n = plan.numbering ?? {};

  if (plan.structure !== 'topics-not-units') fail('unit-plan must declare structure "topics-not-units"');
  if (plan.curriculumFirst !== true) fail('curriculum questions must come first');
  if (n.pageNumbering !== 'continuous') fail('page numbering must be continuous');
  if (n.globalContinuousPageNumbering !== true) fail('global continuous page numbering must be enabled');
  if (n.pageNumberDisplay !== 'circle-top-left') fail('page number must display as a top-left circle');
  if (n.questionNumbering !== 'continuous') fail('questions must be numbered continuously');
  if (n.subpartNumbering !== 'hebrew-letters') fail('sub-parts must be lettered (א, ב, ג…)');

  const units = plan.units ?? [];
  const curriculum = units.find((unit) => unit.unit === 5);
  if (!curriculum) {
    fail('unit 5 curriculum source block is missing (kept as provenance)');
  } else {
    if (curriculum.title !== 'שאלות מתוך תוכנית הלימודים') fail('curriculum title mismatch');
    if (curriculum.sourceMode !== 'verbatim') fail('curriculum must use verbatim source mode');
    if (curriculum.contentMutation !== 'forbidden') fail('curriculum content mutation must be forbidden');
  }
}

if (!fs.existsSync(tokensPath)) {
  fail('src/styles/tokens.ts is missing');
} else {
  const tokens = fs.readFileSync(tokensPath, 'utf8');
  const required = [
    "numbering: 'continuous'",
    "pageNumberDisplay: 'circle-top-left'",
    "numbering: 'continuous-global'",
    "subpartNumbering: 'hebrew-letters'",
  ];
  for (const fragment of required) {
    if (!tokens.includes(fragment)) fail(`design token contract missing: ${fragment}`);
  }
}

if (!fs.existsSync(bookletPath)) {
  fail('src/content/booklet.ts is missing — the single booklet-order source');
} else {
  const booklet = fs.readFileSync(bookletPath, 'utf8');
  // The curriculum pages (C-P*) must be declared before any authored page (U*-P*).
  const firstCurriculum = booklet.indexOf("id: 'C-P1'");
  const firstAuthored = booklet.indexOf("id: 'U1-P1'");
  if (firstCurriculum < 0 || firstAuthored < 0) fail('booklet order must list C-P* then U*-P* pages');
  else if (firstCurriculum > firstAuthored) fail('curriculum pages must precede authored pages in booklet order');
  if (!booklet.includes('globalPageNumber') || !booklet.includes('globalQuestionNumber')) {
    fail('booklet.ts must export globalPageNumber and globalQuestionNumber');
  }
}

if (!process.exitCode) {
  console.log('continuous-numbering: PASS');
}
