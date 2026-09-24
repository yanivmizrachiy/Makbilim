import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { AUTHORED_PAGE_COUNT, BOOKLET_PAGES, CURRICULUM_PAGE_COUNT, EXPECTED_PAGES } from './lib/booklet-pages.mjs';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'content', 'page-manifest.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'src', 'styles', 'print.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
const a4 = fs.readFileSync(path.join(root, 'src', 'components', 'A4Page.tsx'), 'utf8');
const q = fs.readFileSync(path.join(root, 'src', 'components', 'QuestionBlock.tsx'), 'utf8');
const unit5 = fs.readFileSync(path.join(root, 'src', 'pages', 'Unit5Pages.tsx'), 'utf8');

const fail = (msg) => { console.error(`page-contract: FAIL — ${msg}`); process.exitCode = 1; };

// The provenance manifest (internal unit → local pages) must agree with booklet-pages.json, the one
// source of the printed order; the counts are derived there, never restated here.
const originalPages = manifest.originalUnits.reduce((sum, unit) => sum + unit.pages, 0);
if (originalPages !== AUTHORED_PAGE_COUNT) fail(`expected ${AUTHORED_PAGE_COUNT} authored A4 pages (booklet-pages.json), got ${originalPages}`);
for (const unit of manifest.originalUnits) {
  const expected = Array.from({ length: unit.pages }, (_, i) => i + 1);
  if (JSON.stringify(unit.pageNumbers) !== JSON.stringify(expected)) fail(`unit ${unit.unit} page numbering must start at 1 and be contiguous`);
  const bookletPages = BOOKLET_PAGES.filter(page => page.id.startsWith(`U${unit.unit}-`)).length;
  if (bookletPages !== unit.pages) fail(`unit ${unit.unit} declares ${unit.pages} pages but booklet-pages.json prints ${bookletPages}`);
  for (const local of unit.pageNumbers) {
    if (!BOOKLET_PAGES.some(page => page.id === `U${unit.unit}-P${local}`)) fail(`page U${unit.unit}-P${local} is not in booklet-pages.json`);
  }
}

const curriculum = manifest.curriculumUnit;
if (curriculum.unit !== 5 || curriculum.title !== 'שאלות מתוך תוכנית הלימודים') fail('unit 5 identity mismatch');
if (curriculum.sourceMode !== 'verbatim' || curriculum.identifiedQuestionBlocks !== 8) fail('unit 5 must contain eight verbatim BBB blocks');
if (curriculum.pages !== CURRICULUM_PAGE_COUNT || JSON.stringify(curriculum.pageNumbers) !== JSON.stringify(Array.from({ length: CURRICULUM_PAGE_COUNT }, (_, i) => i + 1))) fail(`the curriculum must span the ${CURRICULUM_PAGE_COUNT} verbatim pages of booklet-pages.json, numbered locally from 1`);
if (BOOKLET_PAGES.slice(0, CURRICULUM_PAGE_COUNT).some(page => !page.curriculum)) fail('the curriculum pages must come first (SPEC 4.3)');

for (const fragment of ['size: A4 portrait', 'width: 210mm', 'height: 297mm', '.page-content', '.page-footer']) {
  if (!css.includes(fragment)) fail(`print.css missing ${fragment}`);
}
if (!a4.includes("projectTitle = 'זוויות בין ישרים מקבילים'")) fail('A4Page must carry canonical project title');
if (!a4.includes('printTokens.footer.line1') || !a4.includes('printTokens.footer.line2')) fail('canonical two-line footer missing');
if (!q.includes('globalQuestionNumber(taskId)')) fail('question must render its continuous global number');
if (!q.includes('className="question-marker"') || !q.includes('className="subpart-marker"')) fail('question/subpart marker slots missing');
for (const component of ['Unit1Continuation', 'Unit2Pages', 'Unit3Pages', 'Unit4Pages', 'Unit5Pages']) {
  if (!app.includes(component)) fail(`App is not rendering ${component}`);
}
if (!unit5.includes('data-curriculum-ready="true"') || !unit5.includes('blockCount !== 8')) fail('unit 5 source-integrity rendering guard missing');
if (!process.exitCode) console.log(`page-contract: PASS — ${EXPECTED_PAGES} A4 student pages (${CURRICULUM_PAGE_COUNT} curriculum + ${AUTHORED_PAGE_COUNT} authored) registered in booklet-pages.json`);
