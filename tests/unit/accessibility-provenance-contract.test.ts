import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('accessibility and provenance contracts', () => {
  it('keeps A4 pages as articles without repeated main landmarks', () => {
    const page = read('src/components/A4Page.tsx');
    expect(page).toContain('<article');
    expect(page).not.toContain('<main className="page-content">');
    expect(page).toContain('role="group"');
    expect(page).toContain('תוכן עמוד');
  });

  it('enforces rendered student accessibility in browser QA', () => {
    const build = read('scripts/build-pdf.mjs');
    expect(build).toContain('Accessibility QA failed');
    expect(build).toContain('mainLandmarkCount');
    expect(build).toContain('geometryAccessible');
    expect(build).toContain('mathAccessible');
    expect(build).toContain('duplicateIds');
    expect(build).toContain('hiddenFocusable');
    expect(build).toContain('accessibility-report.json');
  });

  it('enforces teacher accessibility in teacher PDF QA', () => {
    const build = read('scripts/build-teacher-pdf.mjs');
    expect(build).toContain('Teacher accessibility QA failed');
    expect(build).toContain('mainLandmarkCount');
    expect(build).toContain('h1Count');
    expect(build).toContain('mathAccessible');
    expect(build).toContain('duplicateIds');
    expect(build).toContain('accessibility: accessibilityStatus');
  });

  it('requires explicit provenance without inferring licenses', () => {
    const manifest = JSON.parse(read('sources/manifest.json')) as {
      sourceCount: number;
      provenancePolicy: { sourceIdType: string; rightsStatusDefault: string; noLicenseInference: boolean };
      items: Array<{ sourceIdType: string; usageMode: string; rightsStatus: string }>;
    };

    expect(manifest.sourceCount).toBe(30);
    expect(manifest.provenancePolicy.sourceIdType).toBe('google-drive-file-id');
    expect(manifest.provenancePolicy.rightsStatusDefault).toBe('not-asserted');
    expect(manifest.provenancePolicy.noLicenseInference).toBe(true);
    expect(manifest.items).toHaveLength(30);
    for (const item of manifest.items) {
      expect(item.sourceIdType).toBe('google-drive-file-id');
      expect(item.usageMode.length).toBeGreaterThan(0);
      expect(item.rightsStatus).toBe('not-asserted');
    }
  });
});
