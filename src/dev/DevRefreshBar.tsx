import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * DevRefreshBar — a development-only live-preview control.
 *
 * It is mounted ONLY from `main.tsx` behind `import.meta.env.DEV`, into its own
 * DOM host appended to <body> (never inside #root). It therefore:
 *   - never appears in the production build (`vite build` strips the DEV branch),
 *   - never touches the student A4 pages, the teacher app, unit tests, or the PDF,
 *   - is hidden in print via an injected `@media print` rule (belt-and-suspenders).
 *
 * Purpose: while Claude edits files, Vite HMR already refreshes the page
 * automatically. This bar makes that loop explicit — it shows when the preview
 * last loaded, offers a one-click hard refresh, and an optional auto-refresh.
 */

const HOST_ID = 'dev-refresh-bar-root';

function clock(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const AUTO_INTERVAL_SECONDS = 3;

function DevRefreshBar() {
  const [loadedAt] = useState(clock);
  const [auto, setAuto] = useState(false);
  const [remaining, setRemaining] = useState(AUTO_INTERVAL_SECONDS);

  useEffect(() => {
    if (!auto) {
      setRemaining(AUTO_INTERVAL_SECONDS);
      return;
    }
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          window.location.reload();
          return AUTO_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [auto]);

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        insetBlockStart: '14px',
        insetInlineStart: '14px',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '999px',
        background: 'rgba(15, 23, 42, 0.92)',
        color: '#f8fafc',
        font: '600 12px/1.2 "Segoe UI", system-ui, sans-serif',
        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(6px)',
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          background: auto ? '#f59e0b' : '#22c55e',
          boxShadow: `0 0 0 3px ${auto ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.25)'}`,
        }}
      />
      <span style={{ opacity: 0.85 }}>תצוגה חיה · נטען {loadedAt}</span>

      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          cursor: 'pointer',
          border: 'none',
          borderRadius: '999px',
          padding: '5px 12px',
          background: '#38bdf8',
          color: '#082f49',
          font: 'inherit',
          fontWeight: 700,
        }}
      >
        רענן עכשיו
      </button>

      <button
        type="button"
        onClick={() => setAuto(value => !value)}
        aria-pressed={auto}
        style={{
          cursor: 'pointer',
          border: `1px solid ${auto ? '#f59e0b' : 'rgba(248,250,252,0.4)'}`,
          borderRadius: '999px',
          padding: '5px 12px',
          background: auto ? 'rgba(245,158,11,0.18)' : 'transparent',
          color: '#f8fafc',
          font: 'inherit',
        }}
      >
        {auto ? `אוטומטי (${remaining}s)` : 'אוטומטי'}
      </button>
    </div>
  );
}

export function mountDevRefreshBar(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(HOST_ID)) return;

  const style = document.createElement('style');
  style.textContent = `@media print { #${HOST_ID} { display: none !important; } }`;
  document.head.appendChild(style);

  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  createRoot(host).render(<DevRefreshBar />);
}
