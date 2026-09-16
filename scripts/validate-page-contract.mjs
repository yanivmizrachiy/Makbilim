import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'src', 'content', 'page-manifest.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'src', 'styles', 'print.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
const a4 = fs.readFileSync(path.join(root, 'src', 'components', 'A4Page.tsx'), 'utf8');
const q = fs.readFileSync(path.join(root, 'src', 'components', 'QuestionBlock.tsx'), 'utf8');
const unit5 = fs.readFileSync(path.join(root, 'src', 'pages', 'Unit5Pages.tsx'), 'utf8');

const fail = (msg) => { console.error(`page-contract: FAIL — ${msg}`); process.exitCode = 1; };

const originalPages = manifest.originalUnits.reduce((sum, unit) => sum + unit.pages, 0);
if (originalPages !== 14 || manifest.originalPageCount !== 14) fail(`expected 14 original A4 pages, got ${originalPages}`);
for (const unit of manifest.originalUnits) {
  const expected = Array.from({ length: unit.pages }, (_, i) => i + 1);
  if (JSON.stringify(unit.pageNumbers) !== JSON.stringify(expected)) fail(`unit ${unit.unit} page numbering must start at 1 and be contiguous`);
}

const curriculum = manifest.curriculumUnit;
if (curriculum.unit !== 5 || curriculum.title !== 'שאלות מתוך תוכנית הלימודים') fail('unit 5 identity mismatch');
if (curriculum.sourceMode !== 'verbatim' || curriculum.identifiedQuestionBlocks !== 8) fail('unit 5 must contain eight verbatim BBB blocks');
if (curriculum.pages !== 4 || JSON.stringify(curriculum.pageNumbers) !== JSON.stringify([1,2,3,4])) fail('unit 5 must contain four local pages numbered 1–4');
if (manifest.studentPageCount !== 18) fail(`expected 18 student pages, got ${manifest.studentPageCount}`);

for (const fragment of ['size: A4 portrait', 'width: 210mm', 'height: 297mm', '.page-content', '.page-footer']) {
  if (!css.includes(fragment)) fail(`print.css missing ${fragment}`);
}
if (!a4.includes("projectTitle = 'זוויות בין ישרים מקבילים'")) fail('A4Page must carry canonical project title');
if (!a4.includes('printTokens.footer.line1') || !a4.includes('printTokens.footer.line2')) fail('canonical two-line footer missing');
if (!q.includes('>●<') || !q.includes('>•<')) fail('question/subpart solid markers are missing in units 1–4');
for (const component of ['Unit1Continuation', 'Unit2Pages', 'Unit3Pages', 'Unit4Pages', 'Unit5Pages']) {
  if (!app.includes(component)) fail(`App is not rendering ${component}`);
}
if (!unit5.includes('data-curriculum-ready="true"') || !unit5.includes('blockCount !== 8')) fail('unit 5 source-integrity rendering guard missing');
if (!process.exitCode) console.log('page-contract: PASS — 18 A4 student pages structurally registered across five units');
