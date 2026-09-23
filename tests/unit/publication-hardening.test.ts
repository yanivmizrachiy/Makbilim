import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
const studentVite = read('vite.config.ts');
const teacherVite = read('vite.teacher.config.ts');
const teacherHtml = read('teacher.html');
const teacherApp = read('src/TeacherApp.tsx');
const teacherBuild = read('scripts/build-teacher-pdf.mjs');
const ci = read('.github/workflows/ci.yml');
const baseline = JSON.parse(read('qa/visual-baseline.json')) as {
  pageCount: number;
  layout: unknown[];
};

describe('publication hardening', () => {
  it('keeps teacher answers out of the student Pages bundle', () => {
    expect(studentVite).not.toContain('teacher.html');
    expect(teacherVite).toContain("outDir: 'dist-teacher'");
    expect(teacherVite).toContain("input: 'teacher.html'");
    expect(ci).toContain('path: dist');
    expect(ci).not.toContain('path: dist-teacher');
  });

  it('renders the teacher guide from the canonical answer key', () => {
    expect(teacherHtml).toContain('/src/teacher-main.tsx');
    expect(teacherApp).toContain("from './content/answer-key'");
    expect(teacherApp).toContain('teacherAnswerKey');
    expect(teacherApp).toContain('curriculumAnswerKeyPolicy');
    expect(teacherApp).toContain('data-answer-count');
  });

  it('validates the teacher PDF as an independent A4 artifact', () => {
    expect(pkg.scripts['build:teacher']).toContain('vite.teacher.config.ts');
    expect(pkg.scripts['pdf:teacher']).toContain('build-teacher-pdf.mjs');
    expect(pkg.scripts.pdf).toContain('pdf:teacher');
    expect(teacherBuild).toContain('Teacher answer count mismatch');
    expect(teacherBuild).toContain('Teacher PDF contains non-A4 pages');
    expect(teacherBuild).toContain('teacher-pdf-report.json');
  });

  it('tracks a canonical visual baseline for all 19 student pages', () => {
    expect(baseline.pageCount).toBe(19);
    expect(baseline.layout).toHaveLength(19);
    expect(pkg.scripts['validate:visual-baseline']).toContain('validate-visual-baseline.mjs');
    expect(pkg.scripts.pdf).toContain('validate:visual-baseline');
  });
});
