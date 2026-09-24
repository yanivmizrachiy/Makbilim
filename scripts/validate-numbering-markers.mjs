import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { BOOKLET_PAGES, NUMBERING } from './lib/booklet-pages.mjs';

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

// The numbering policy is stated once, in booklet-pages.json (read via scripts/lib/booklet-pages.mjs).
const n = NUMBERING ?? {};
if (n.structure !== 'topics-not-units') fail('booklet-pages.json must declare structure "topics-not-units"');
if (n.curriculumFirst !== true) fail('curriculum questions must come first');
if (n.page !== 'continuous') fail('page numbering must be continuous');
if (n.pageDisplay !== 'circle-top-left') fail('page number must display as a top-left circle');
if (n.question !== 'dot-marker') fail('questions open with a ● marker, never a number');
if (n.subpart !== 'dot-marker') fail('sub-parts open with a • marker, never a letter or number');
if (n.curriculumNumberIsChrome !== true) fail('the curriculum question marker must be booklet chrome, never source text');
if (n.unitsAreProvenanceOnly !== true) fail('internal unit ids (questions-unit*.ts, U*-P*) are provenance only and never a student-facing structure');

if (!fs.existsSync(unitPlanPath)) {
  fail('src/content/unit-plan.json is missing');
} else {
  const plan = JSON.parse(fs.readFileSync(unitPlanPath, 'utf8'));
  const curriculum = (plan.units ?? []).find((unit) => unit.unit === 5);
  if (!curriculum) {
    fail('unit 5 curriculum source block is missing (kept as provenance)');
  } else {
    if (curriculum.title !== 'שאלות מתוך תוכנית הלימודים') fail('curriculum title mismatch');
    if (curriculum.sourceMode !== 'verbatim') fail('curriculum must use verbatim source mode');
    if (curriculum.contentMutation !== 'forbidden') fail('curriculum content mutation must be forbidden');
  }
}

// No other file restates the policy (one source of truth).
for (const file of ['src/content/page-manifest.json', 'src/content/unit-plan.json', 'src/content/question-plan.json', 'src/styles/tokens.ts']) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  if (/circle-top-left|dot-marker|"pageNumbering"|numbering: '/.test(text)) fail(`${file} restates the numbering policy — it lives only in booklet-pages.json`);
}

// The printed order lives in booklet-pages.json (read through scripts/lib/booklet-pages.mjs, the
// same file booklet.ts derives from): the curriculum pages must come first, then the authored pages.
const firstAuthored = BOOKLET_PAGES.findIndex(page => !page.curriculum);
if (firstAuthored < 1) fail('booklet-pages.json must open with the curriculum pages (C-P*) before any authored page');
if (BOOKLET_PAGES.slice(firstAuthored).some(page => page.curriculum)) fail('curriculum pages must all precede the authored pages in booklet-pages.json');
if (BOOKLET_PAGES.some(page => !/^(C|U[1-4])-P[1-9]$/.test(page.id) || !page.topic || /יחידה/.test(page.topic))) {
  fail('every booklet page needs an internal id (C-P* / U*-P*) and a natural topic title without "יחידה"');
}
if (!fs.existsSync(bookletPath)) {
  fail('src/content/booklet.ts is missing — the numbering module');
} else {
  const booklet = fs.readFileSync(bookletPath, 'utf8');
  if (!booklet.includes("from './booklet-pages.json'")) fail('booklet.ts must derive BOOKLET_PAGES from booklet-pages.json (one source of the order)');
  if (!booklet.includes('globalPageNumber')) {
    fail('booklet.ts must export globalPageNumber');
  }
  const qb = fs.readFileSync(path.join(root, 'src', 'components', 'QuestionBlock.tsx'), 'utf8');
  if (!qb.includes("className=\"question-marker\"") || !qb.includes('●')) fail('a question must open with a ● marker (question-marker)');
  if (!qb.includes("className=\"subpart-marker\"") || !qb.includes('•')) fail('a sub-part must open with a • marker (subpart-marker)');
  if (qb.includes('globalQuestionNumber') || qb.includes('className="task-kind"')) fail('student pages must not print a question number or a task-type label');
}

if (!process.exitCode) {
  console.log('continuous-numbering: PASS');
}
