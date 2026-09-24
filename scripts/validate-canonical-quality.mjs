import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const plan = JSON.parse(read('src/content/question-plan.json'));
const spec = read('SPEC.md');
const questionFiles = [1, 2, 3, 4].map(n => `src/content/questions-unit${n}.ts`);
const questionText = Object.fromEntries(questionFiles.map(p => [p, read(p)]));
const allQuestionText = Object.values(questionText).join('\n');
const pageFiles = [
  'src/App.tsx',
  'src/pages/Unit1Continuation.tsx',
  'src/pages/Unit2Pages.tsx',
  'src/pages/Unit3Pages.tsx',
  'src/pages/Unit4Pages.tsx',
  'src/pages/Unit5Pages.tsx',
];
const pageText = pageFiles.map(read).join('\n');

const failures = [];
const gate = (name, condition, details = '') => {
  if (!condition) failures.push(`${name}${details ? ` — ${details}` : ''}`);
  else console.log(`${name}: PASS`);
};

const originalTasks = (plan.units ?? [])
  .filter(u => u.unit <= 4)
  .flatMap(u => (u.tasks ?? []).map((task, index) => ({ ...task, unit: u.unit, _index: index })));

gate('coverage', originalTasks.length === plan.originalTaskCount, `expected ${plan.originalTaskCount} original tasks (question-plan originalTaskCount), found ${originalTasks.length}`);

gate('unique-ids', new Set(originalTasks.map(t => t.id)).size === originalTasks.length, 'task ids must be unique');

const signatureCounts = new Map();
for (const t of originalTasks) {
  const signature = [t.skill, t.format, t.difficulty, t.visualDemand, (t.theoremIds ?? []).join('+'), t.progressionGain].join('|');
  signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
}
const exactDuplicates = [...signatureCounts.entries()].filter(([, count]) => count > 1);
gate('duplicates', exactDuplicates.length === 0, exactDuplicates.map(([sig, count]) => `${count}× ${sig}`).join('; '));

// Local variety rejects actual repetition, not legitimate progression that happens to
// reuse a familiar worksheet format. Three adjacent tasks fail only when both the
// response format and the mathematical skill repeat across all three.
let localVarietyOk = true;
const localVarietyFailures = [];
for (const unit of plan.units ?? []) {
  if (unit.unit > 4) continue;
  const tasks = unit.tasks ?? [];
  for (let i = 2; i < tasks.length; i += 1) {
    const trio = tasks.slice(i - 2, i + 1);
    const sameFormat = trio.every(t => t.format === trio[0].format);
    const sameSkill = trio.every(t => t.skill === trio[0].skill);
    if (sameFormat && sameSkill) {
      localVarietyOk = false;
      localVarietyFailures.push(trio.map(t => t.id).join(' → '));
    }
  }
}
gate('local-variety', localVarietyOk,
  localVarietyFailures.length ? `repeated format+skill: ${localVarietyFailures.join('; ')}` : 'no three consecutive original tasks may repeat both format and skill');

const unit2 = (plan.units ?? []).find(u => u.unit === 2);
const u2Tasks = unit2?.tasks ?? [];
const earlyAlgebra = u2Tasks.filter(t => t.page < 4 && /algebra|equation|variable|unknown/i.test(`${t.format} ${t.skill}`));
const numericFlagErrors = u2Tasks.filter(t => t.page <= 3 && t.numericBeforeAlgebra !== true);
const algebraPageErrors = u2Tasks.filter(t => /algebra|equation|variable|unknown/i.test(`${t.format} ${t.skill}`) && t.page < 4);
gate('numeric-before-algebra', earlyAlgebra.length === 0 && numericFlagErrors.length === 0 && algebraPageErrors.length === 0,
  [...earlyAlgebra, ...numericFlagErrors, ...algebraPageErrors].map(t => t.id).join(', '));

const theoremSentences = [
  'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, אז כל זוג זוויות מתאימות שוות זו לזו.',
  'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, אז כל זוג זוויות מתחלפות שוות זו לזו.',
  'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתאימות שוות זו לזו, אז שני הישרים מקבילים.',
  'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתחלפות שוות זו לזו, אז שני הישרים מקבילים.',
];
gate('theorem-conditions', theoremSentences.every(sentence => spec.includes(sentence)), 'all four canonical theorem sentences must appear verbatim in SPEC.md');

const badJustifications = [...allQuestionText.matchAll(/justification:\s*['"]([^'"]+)['"]/g)]
  .map(m => m[1])
  .filter(text => /זוויות\s+(מתאימות|מתחלפות)/.test(text) && !/בין ישרים מקבילים/.test(text));
gate('theorem-wording', badJustifications.length === 0, badJustifications.join(' | '));

// Equation justification is a cross-unit contract: Unit 2 introduces algebra and
// Unit 4 contains one converse-algebra task. Count the plan and authored content
// across both units so the gate verifies the real requirement instead of only U2.
const requiresLane = originalTasks.filter(t => t.requiresJustificationLane === true);
const laneCount = [2, 4]
  .map(unit => (questionText[`src/content/questions-unit${unit}.ts`].match(/justificationLane:\s*true/g) ?? []).length)
  .reduce((sum, count) => sum + count, 0);
gate('equation-justification', laneCount === requiresLane.length && laneCount > 0,
  `plan requires ${requiresLane.length} justification lanes; content defines ${laneCount}`);

const bannedStudentCopy = [
  /\bplaceholder\b/i,
  /\bdemo\b/i,
  /\bsample\b/i,
  /כאן תופיע שאלה/,
  /בקרוב/,
  /בואו נגלה/,
  /מה אתם חושבים/,
  /אתגר מגניב/,
];
const bannedHits = bannedStudentCopy.flatMap(re => {
  const hits = [];
  for (const [file, text] of Object.entries(questionText)) if (re.test(text)) hits.push(`${file}: ${re}`);
  return hits;
});
gate('student-facing-copy', bannedHits.length === 0, bannedHits.join('; '));

// Stems are single-quoted literals, or template literals when they quote a canonical sentence from theorems.ts.
const stemValues = [...allQuestionText.matchAll(/stem:\s*(?:'([^']+)'|`([^`]+)`)/g)].map(m => m[1] ?? m[2]);
gate('hebrew', stemValues.length >= plan.originalTaskCount && stemValues.every(s => /[\u0590-\u05FF]/.test(s)), `found ${stemValues.length} Hebrew stems`);

const normalizedStemCounts = new Map();
for (const stem of stemValues) {
  const normalized = stem.replace(/\s+/g, ' ').trim();
  normalizedStemCounts.set(normalized, (normalizedStemCounts.get(normalized) ?? 0) + 1);
}
const repeatedStems = [...normalizedStemCounts.entries()].filter(([, count]) => count > 1);
gate('duplicate-stems', repeatedStems.length === 0,
  repeatedStems.map(([stem, count]) => `${count}× ${stem}`).join(' | '));

const forbiddenAiPhrases = ['בואו', 'מה דעתכם', 'נסו לגלות', 'אתגר מגניב', 'מגניב'];
const aiPhraseHits = stemValues.filter(s => forbiddenAiPhrases.some(p => s.includes(p)));
gate('wording-style', aiPhraseHits.length === 0, aiPhraseHits.join(' | '));

const authoredPagesUseSvg = ['Unit1Continuation.tsx', 'Unit2Pages.tsx', 'Unit3Pages.tsx', 'Unit4Pages.tsx']
  .every(name => {
    const p = `src/pages/${name}`;
    const text = read(p);
    return /ParallelLinesDiagram|<svg|diagram=/.test(text);
  });
gate('svg-geometry', authoredPagesUseSvg && /ParallelLinesDiagram/.test(read('src/App.tsx')), 'authored units must render vector geometry');

// SPEC 4.2 / 11.5: a question opens with a ● marker, a sub-part with a •; questions are NOT numbered.
const questionBlock = read('src/components/QuestionBlock.tsx');
const hasQuestionMarker = pageText.includes('QuestionBlock') && questionBlock.includes('●') && questionBlock.includes('className="question-marker"');
const hasSubpartMarker = questionBlock.includes('className="subpart-marker"') && questionBlock.includes('•');
const noNumberNoLabel = !questionBlock.includes('globalQuestionNumber') && !questionBlock.includes('className="task-kind"');
gate('markers', hasQuestionMarker && hasSubpartMarker && noNumberNoLabel && spec.includes('●') && spec.includes('•'), 'question opens with ●, sub-part with •, no question number and no task-type label');

const visualDemandOrder = { V1: 1, V2: 2, V3: 3, V4: 4 };
let visualProgressionOk = true;
for (const unit of plan.units ?? []) {
  if (unit.unit > 4) continue;
  const tasks = unit.tasks ?? [];
  for (let i = 1; i < tasks.length; i += 1) {
    const prev = visualDemandOrder[tasks[i - 1].visualDemand] ?? 0;
    const curr = visualDemandOrder[tasks[i].visualDemand] ?? 0;
    if (curr - prev > 2) visualProgressionOk = false;
  }
}
gate('visual-progression', visualProgressionOk, 'visual complexity must not jump by more than two levels between adjacent tasks');

if (failures.length) {
  console.error('\ncanonical-quality: FAIL');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log(`\ncanonical-quality: PASS — ${originalTasks.length} original tasks validated across didactics, wording, theorem use, algebra sequencing and SVG contracts`);
