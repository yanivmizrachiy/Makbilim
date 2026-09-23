import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const root = process.cwd();
const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const PROJECT = 'זוויות בין ישרים מקבילים';

const pageUnitSchema = z.object({
  unit: z.number().int().min(1).max(4),
  title: z.string().min(1),
  pages: z.number().int().positive(),
  pageNumbers: z.array(z.number().int().positive()).min(1),
});

const pageManifestSchema = z.object({
  projectTitle: z.literal(PROJECT),
  canonicalSpec: z.literal('SPEC.md'),
  pageNumbering: z.literal('continuous'),
  originalUnits: z.array(pageUnitSchema).length(4),
  originalPageCount: z.literal(17),
  curriculumUnit: z.object({
    unit: z.literal(5),
    title: z.string().min(1),
    sourceMode: z.literal('verbatim'),
    identifiedQuestionBlocks: z.literal(8),
    pages: z.literal(4),
    pageNumbers: z.array(z.number().int().positive()).length(4),
    questionsPerPage: z.literal(2),
    firstPage: z.literal(1),
  }),
  studentPageCount: z.literal(21),
  studentFacingRules: z.object({
    questionNumbering: z.literal('continuous'),
    subpartNumbering: z.literal('hebrew-letters'),
    pageNumbering: z.literal('continuous'),
    pageNumberDisplay: z.literal('circle-top-left'),
    curriculumFirst: z.literal(true),
    curriculumGlobalNumberIsChrome: z.literal(true),
    footerRequired: z.literal(true),
    projectTitleRequired: z.literal(true),
  }),
}).passthrough();

const unitPlanSchema = z.object({
  projectTitle: z.literal(PROJECT),
  canonicalSpec: z.literal('SPEC.md'),
  numbering: z.object({
    pageNumbering: z.literal('continuous'),
    globalContinuousPageNumbering: z.literal(true),
    pageNumberDisplay: z.literal('circle-top-left'),
    questionNumbering: z.literal('continuous'),
    subpartNumbering: z.literal('hebrew-letters'),
  }).passthrough(),
  units: z.array(z.object({
    unit: z.number().int().min(1).max(5),
    title: z.string().min(1),
    pageStart: z.literal(1),
  }).passthrough()).length(5),
});

const taskSchema = z.object({
  id: z.string().regex(/^U[1-4]-P[1-6]-[A-Z]$/),
  page: z.number().int().positive(),
  difficulty: z.string().regex(/^D[1-5]$/),
  visualDemand: z.string().regex(/^V[1-4]$/),
  format: z.string().min(1),
  skill: z.string().min(1),
  theoremIds: z.array(z.string().regex(/^T[1-4]$/)),
  instructionVerb: z.string().min(1),
  // SPEC 6.1: every original task carries an authored, Hebrew misconception target \u2014
  // the same contract as tests/unit/didactic-profile.test.ts (no English, no generic fallback).
  misconceptionTarget: z.string().trim().min(8)
    .regex(/[\u0590-\u05FF]/, 'misconceptionTarget must be written in Hebrew')
    .refine(value => !/[A-Za-z]{3,}/.test(value), 'misconceptionTarget must not contain English words')
    .refine(
      value => !['\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D9\u05E9\u05D9\u05E8 \u05D1\u05DE\u05E7\u05D5\u05DD \u05D1\u05DE\u05E9\u05E4\u05D8 \u05D4\u05D4\u05E4\u05D5\u05DA', '\u05D1\u05D7\u05D9\u05E8\u05EA \u05E7\u05E9\u05E8 \u05D6\u05D5\u05D5\u05D9\u05D5\u05EA \u05D0\u05D5 \u05DE\u05E9\u05E4\u05D8 \u05E9\u05D0\u05D9\u05E0\u05D5 \u05DE\u05EA\u05D0\u05D9\u05DD \u05DC\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD'].includes(value),
      'misconceptionTarget must be specific to its task, not a generic fallback',
    ),
  progressionGain: z.string().min(1),
}).passthrough();

const questionUnitSchema = z.object({
  unit: z.number().int().min(1).max(4),
  title: z.string().min(1),
  pages: z.number().int().positive(),
  taskCount: z.number().int().positive(),
  tasks: z.array(taskSchema).min(1),
});

const questionPlanSchema = z.object({
  projectTitle: z.literal(PROJECT),
  canonicalSpec: z.literal('SPEC.md'),
  studentVisibleQuestionNumbers: z.literal(true),
  questionNumbering: z.literal('continuous-global'),
  subpartNumbering: z.literal('hebrew-letters'),
  originalTaskCount: z.literal(62),
  curriculumSourceTaskBlocks: z.literal(8),
  units: z.array(questionUnitSchema).length(4),
});

const sourceItemSchema = z.object({
  id: z.string().min(10),
  title: z.string().min(1),
  mimeType: z.string().min(1),
  category: z.enum(['web-reference', 'visual-task-reference', 'instructional-source', 'worksheet-source', 'core-source']),
  storageStatus: z.string().min(1),
  sourceIdType: z.literal('google-drive-file-id'),
  usageMode: z.enum(['external-reference', 'visual-reference', 'instructional-reference', 'worksheet-reference', 'core-reference']),
  rightsStatus: z.literal('not-asserted'),
});

const sourceManifestSchema = z.object({
  canonicalSpec: z.literal('SPEC.md'),
  sourceRoot: z.string().min(1),
  sourceCount: z.literal(30),
  policy: z.object({
    role: z.string().min(1),
    requirementsSource: z.literal(false),
    preserveOriginals: z.literal(true),
  }).passthrough(),
  provenancePolicy: z.object({
    version: z.literal(1),
    sourceIdType: z.literal('google-drive-file-id'),
    rightsStatusDefault: z.literal('not-asserted'),
    noLicenseInference: z.literal(true),
    note: z.string().min(1),
  }),
  items: z.array(sourceItemSchema).length(30),
});

const pageManifest = pageManifestSchema.parse(readJson('src/content/page-manifest.json'));
const unitPlan = unitPlanSchema.parse(readJson('src/content/unit-plan.json'));
const questionPlan = questionPlanSchema.parse(readJson('src/content/question-plan.json'));
const sourceManifest = sourceManifestSchema.parse(readJson('sources/manifest.json'));

const assert = (condition, message) => {
  if (!condition) throw new Error(`schema-crosscheck: ${message}`);
};

assert(pageManifest.originalUnits.map(x => x.unit).join(',') === '1,2,3,4', 'page-manifest units must be 1–4 in order');
assert(unitPlan.units.map(x => x.unit).join(',') === '1,2,3,4,5', 'unit-plan units must be 1–5 in order');
assert(questionPlan.units.map(x => x.unit).join(',') === '1,2,3,4', 'question-plan units must be 1–4 in order');
assert(pageManifest.originalUnits.reduce((sum, x) => sum + x.pages, 0) === pageManifest.originalPageCount, 'original page subtotal mismatch');
assert(pageManifest.originalPageCount + pageManifest.curriculumUnit.pages === pageManifest.studentPageCount, 'student page total mismatch');
assert(questionPlan.units.reduce((sum, x) => sum + x.taskCount, 0) === questionPlan.originalTaskCount, 'task-count subtotal mismatch');

const ids = questionPlan.units.flatMap(unit => unit.tasks.map(task => task.id));
assert(new Set(ids).size === ids.length, 'question IDs must be unique');

for (const unit of questionPlan.units) {
  assert(unit.tasks.length === unit.taskCount, `unit ${unit.unit} taskCount mismatch`);
  for (const task of unit.tasks) {
    assert(task.page <= unit.pages, `${task.id} points outside unit page range`);
  }
  const manifestUnit = pageManifest.originalUnits.find(x => x.unit === unit.unit);
  assert(Boolean(manifestUnit), `unit ${unit.unit} missing from page manifest`);
  assert(manifestUnit.pages === unit.pages, `unit ${unit.unit} page count differs between manifests`);
}

const sourceIds = sourceManifest.items.map(item => item.id);
assert(new Set(sourceIds).size === sourceIds.length, 'source IDs must be unique');
assert(sourceManifest.items.length === sourceManifest.sourceCount, 'sourceCount mismatch');

console.log('schema-validation: PASS — Zod validated page/unit/question/source manifests and cross-file invariants');
