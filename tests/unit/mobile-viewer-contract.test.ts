import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const controls = fs.readFileSync('src/components/MobileViewerControls.tsx', 'utf8');
const viewerCss = fs.readFileSync('src/styles/viewer.css', 'utf8');

describe('mobile viewer, print and AR contract', () => {
  it('mounts the screen-only viewer controls without changing the A4 booklet source', () => {
    expect(app).toContain('<MobileViewerControls />');
    expect(app).toContain("import './styles/viewer.css'");
  });

  it('offers native phone share, print and camera-overlay AR actions', () => {
    expect(controls).toContain('navigator.share');
    expect(controls).toContain('window.print()');
    expect(controls).toContain('getUserMedia');
    expect(controls).toContain("facingMode: { ideal: 'environment' }");
    expect(controls).toContain('AR / וידאו');
  });

  it('locks the phone preview to one stable A4 scale without scroll-time resize drift', () => {
    expect(controls).toContain('PAGE_WIDTH_PX');
    expect(controls).toContain("--mobile-a4-scale");
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
