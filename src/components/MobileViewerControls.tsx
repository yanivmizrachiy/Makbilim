import { useEffect, useRef, useState } from 'react';

const PAGE_WIDTH_PX = 210 * 96 / 25.4;

function visiblePage(): HTMLElement | null {
  const pages = [...document.querySelectorAll<HTMLElement>('.a4-page')];
  if (!pages.length) return null;
  const viewportMid = window.innerHeight / 2;
  return pages.reduce((best, page) => {
    const r = page.getBoundingClientRect();
    const bestR = best.getBoundingClientRect();
    const d = Math.abs((r.top + r.bottom) / 2 - viewportMid);
    const bestD = Math.abs((bestR.top + bestR.bottom) / 2 - viewportMid);
    return d < bestD ? page : best;
  });
}

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
  const [arOpen, setArOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    applyLockedA4Scale();

    const onOrientationChange = () => {
      window.setTimeout(applyLockedA4Scale, 180);
    };

    window.addEventListener('orientationchange', onOrientationChange, { passive: true });
    return () => window.removeEventListener('orientationchange', onOrientationChange);
  }, []);

  const share = async () => {
    const data = {
      title: 'זוויות בין ישרים מקבילים',
      text: 'זוויות בין ישרים מקבילים',
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* user cancelled */ }
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      window.alert('הקישור הועתק.');
      return;
    }
    window.prompt('העתיקו את הקישור:', window.location.href);
  };

  const closeAr = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setArOpen(false);
    setCameraError('');
    if (overlayRef.current) overlayRef.current.replaceChildren();
  };

  const openAr = async () => {
    setArOpen(true);
    setCameraError('');
    requestAnimationFrame(async () => {
      const source = visiblePage();
      if (source && overlayRef.current) {
        const clone = source.cloneNode(true) as HTMLElement;
        clone.classList.add('ar-page-clone');
        clone.removeAttribute('data-page');
        overlayRef.current.replaceChildren(clone);
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        setCameraError('לא ניתנה גישה למצלמה. אפשר לאשר מצלמה בדפדפן ולנסות שוב.');
      }
    });
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach(track => track.stop()), []);

  return (
    <>
      <nav className="viewer-controls" aria-label="פעולות לחוברת">
        <button type="button" onClick={share}>שיתוף</button>
        <button type="button" onClick={() => window.print()}>הדפסה</button>
        <button type="button" onClick={openAr}>AR / וידאו</button>
      </nav>

      {arOpen && (
        <div className="ar-view" role="dialog" aria-modal="true" aria-label="תצוגת AR בווידאו">
          <video ref={videoRef} className="ar-camera" playsInline muted />
          <div ref={overlayRef} className="ar-page-overlay" aria-label="הדף מעל תצוגת המצלמה" />
          {cameraError && <div className="ar-error">{cameraError}</div>}
          <div className="ar-actions">
            <button type="button" onClick={closeAr}>סגירה</button>
          </div>
        </div>
      )}
    </>
  );
}
