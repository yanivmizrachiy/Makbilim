import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BOOKLET_PAGE_COUNT } from '../../src/content/booklet';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
const studentVite = read('vite.config.ts');
const teacherVite = read('vite.teacher.config.ts');
const teacherHtml = read('teacher.html');
const teacherApp = read('src/TeacherApp.tsx');
const teacherBuild = read('scripts/build-teacher-pdf.mjs');
const checksumBuild = read('scripts/write-checksums.mjs');
const sbomBuild = read('scripts/write-sbom.mjs');
const ci = read('.github/workflows/ci.yml');
const release = read('.github/workflows/release.yml');
const pythonVersion = read('.python-version').trim();
const nvmrc = read('.nvmrc').trim();
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

  it('creates traceable checksums, SBOM and releases only from matching version tags', () => {
    expect(pkg.scripts.checksums).toContain('write-checksums.mjs');
    expect(pkg.scripts.sbom).toContain('write-sbom.mjs');
    expect(pkg.scripts.pdf).toContain('npm run sbom');
    expect(pkg.scripts.pdf).toContain('npm run checksums');
    expect(checksumBuild).toContain("createHash('sha256')");
    expect(checksumBuild).toContain('SHA256SUMS.txt');
    expect(checksumBuild).toContain('input-fingerprint.json');
    expect(checksumBuild).toContain('aggregateInputSha256');
    expect(sbomBuild).toContain("'sbom', '--sbom-format=cyclonedx'");
    expect(sbomBuild).toContain("sbom.bomFormat !== 'CycloneDX'");
    expect(release).toContain("tags:");
    expect(release).toContain("- 'v*'");
    expect(release).not.toContain('branches:');
    expect(release).toContain('Verify tag matches package version');
    expect(release).toContain('GITHUB_REF_NAME');
    expect(release).toContain('sbom.cdx.json');
    expect(release).toContain('input-fingerprint.json');
    expect(release).toContain('gh release create');
    expect(release).toContain('--verify-tag');
  });

  it('pins exact Node and Python runtimes', () => {
    expect(nvmrc).toBe('22.23.2');
    expect(pythonVersion).toBe('3.14.7');
    expect(ci).toContain("NODE_VERSION: '22.23.2'");
    expect(release).toContain("NODE_VERSION: '22.23.2'");
    expect(ci).toContain("PYTHON_VERSION: '3.14.7'");
    expect(release).toContain("PYTHON_VERSION: '3.14.7'");
    expect(ci).toContain('actions/setup-python@5fda3b95a4ea91299a34e894583c3862153e4b97');
    expect(release).toContain('actions/setup-python@5fda3b95a4ea91299a34e894583c3862153e4b97');
  });

  it('pins all external GitHub Actions to immutable commit SHAs', () => {
    const workflows = [ci, release].join('\n');
    const usesLines = workflows.split('\n').filter(line => line.trim().startsWith('uses:'));
    expect(usesLines.length).toBeGreaterThan(0);
    for (const line of usesLines) {
      expect(line).toMatch(/uses:\s+[^@\s]+@[0-9a-f]{40}(?:\s+#\s+v\d+)?$/);
    }
    expect(workflows).not.toMatch(/uses:\s+[^@\s]+@v\d+/);
  });


  it('forbids scheduled automation and recurring dependency bots', () => {
    const workflows = [ci, release].join('\n');
    expect(workflows).not.toMatch(/\bschedule\s*:/);
    expect(workflows).not.toMatch(/\bcron\s*:/);
    expect(fs.existsSync(path.join(root, '.github', 'dependabot.yml'))).toBe(false);
  });

  it('enforces deterministic dependency policy and production audit', () => {
    const policy = read('scripts/validate-dependency-policy.mjs');
    expect(pkg.scripts['validate:dependencies']).toContain('validate-dependency-policy.mjs');
    expect(pkg.scripts.validate).toContain('validate:dependencies');
    expect(policy).toContain('direct dependencies must be exact versions');
    expect(policy).toContain('lockfileVersion=3');
    expect(policy).toContain('missing integrity');
    expect(ci).toContain('npm audit --omit=dev --audit-level=high');
    expect(release).toContain('npm audit --omit=dev --audit-level=high');
  });

  it('tracks a canonical visual baseline for every student page of booklet-pages.json', () => {
    expect(baseline.pageCount).toBe(BOOKLET_PAGE_COUNT);
    expect(baseline.layout).toHaveLength(BOOKLET_PAGE_COUNT);
    expect(pkg.scripts['validate:visual-baseline']).toContain('validate-visual-baseline.mjs');
    expect(pkg.scripts.pdf).toContain('validate:visual-baseline');
  });
});
