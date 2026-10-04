import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('SPEC 11.1 dead-space gate', () => {
  it('distributes guided-deduction surplus between reasoning steps, not below the final reason', () => {
    const css = read('src/styles/spec-layout-fixes.css');
    expect(css).toContain('.question-main > .deduction-chain');
    expect(css).toContain('justify-content: space-between');
    expect(css).not.toContain('justify-content: space-evenly');
  });

  it('runs the <= 8mm authored-block gate in the canonical PDF pipeline', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const gate = read('scripts/validate-layout-dead-space.mjs');

    expect(pkg.scripts['validate:layout-dead-space']).toBe('node scripts/validate-layout-dead-space.mjs');
    expect(pkg.scripts.pdf).toContain('pdf:chromium && npm run validate:layout-dead-space && npm run validate:visual-baseline');
    expect(gate).toContain('MAX_BLOCK_DEAD_MM = 8');
    expect(gate).toContain('block.blockDeadMm > MAX_BLOCK_DEAD_MM');
  });
});
