import { useEffect } from 'react';

const PAGE_WIDTH_PX = 210 * 96 / 25.4;
const DOWNLOAD_URL = './זוויות-בין-ישרים-מקבילים.pdf';

function applyLockedA4Scale() {
  const cssScreenWidth = Math.min(
    window.screen.width || document.documentElement.clientWidth,
    document.documentElement.clientWidth || window.screen.width,
  );
  const available = Math.max(1, cssScreenWidth - 12);
  const scale = cssScreenWidth <= 900 ? Math.min(1, available / PAGE_WIDTH_PX) : 1;
  document.documentElement.style.setProperty('--mobile-a4-scale', String(scale));
}

export function MobileViewerControls() {
  useEffect(() => {
    applyLockedA4Scale();

    const onOrientationChange = () => {
      window.setTimeout(applyLockedA4Scale, 180);
    };

    window.addEventListener('orientationchange', onOrientationChange, { passive: true });
    return () => window.removeEventListener('orientationchange', onOrientationChange);
  }, []);

  return (
    <nav className="viewer-controls" aria-label="פעולות לחוברת">
      <a className="viewer-action" href={DOWNLOAD_URL} download>
        הורדה
      </a>
      <button className="viewer-action" type="button" onClick={() => window.print()}>
        הדפסה
      </button>
    </nav>
  );
}
