import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const controls = fs.readFileSync('src/components/MobileViewerControls.tsx', 'utf8');
const viewerCss = fs.readFileSync('src/styles/viewer.css', 'utf8');
const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');

describe('mobile viewer, download and print contract', () => {
  it('mounts the screen-only viewer controls without changing the A4 booklet source', () => {
    expect(app).toContain('<MobileViewerControls />');
    expect(app).toContain("import './styles/viewer.css'");
  });

  it('offers only download and print actions', () => {
    expect(controls).toContain('הורדה');
    expect(controls).toContain('הדפסה');
    expect(controls).toContain('window.print()');
    expect(controls).toContain('זוויות-בין-ישרים-מקבילים.pdf');
    expect(controls).not.toContain('navigator.share');
    expect(controls).not.toContain('getUserMedia');
    expect(controls).not.toContain('AR / וידאו');
    expect(viewerCss).not.toContain('.ar-view');
    expect(viewerCss).not.toContain('.ar-camera');
  });

  it('publishes the validated student PDF into the deployed site', () => {
    expect(workflow).toContain('Publish student PDF into site');
    expect(workflow).toContain('artifacts/pdf/זוויות-בין-ישרים-מקבילים-chromium.pdf');
    expect(workflow).toContain('dist/זוויות-בין-ישרים-מקבילים.pdf');
  });

  it('locks the phone preview to one stable A4 scale without scroll-time resize drift', () => {
    expect(controls).toContain('PAGE_WIDTH_PX');
    expect(controls).toContain('--mobile-a4-scale');
    expect(controls).not.toContain("addEventListener('resize'");
    expect(controls).toContain("addEventListener('orientationchange'");
    expect(viewerCss).toMatch(/@media\s+screen\s+and\s+\(max-width:\s*900px\)/);
    expect(viewerCss).toContain('zoom: var(--mobile-a4-scale, 1)');
    expect(viewerCss).toContain('touch-action: pan-y');
    expect(viewerCss).toContain('overflow-x: hidden');
  });

  it('removes viewer chrome and mobile scaling from print', () => {
    expect(viewerCss).toMatch(/@media\s+print[\s\S]*\.viewer-controls[\s\S]*display:\s*none\s*!important/);
    expect(viewerCss).toContain('.a4-page { zoom: 1 !important; }');
  });
});
