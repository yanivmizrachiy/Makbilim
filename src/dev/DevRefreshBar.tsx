import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

/**
 * DevRefreshBar — a development-only live-preview and diagnostics control.
 *
 * It is mounted ONLY from `main.tsx` behind `import.meta.env.DEV`, into its own
 * DOM host appended to <body> (never inside #root). It therefore:
 *   - never appears in the production build (`vite build` strips the DEV branch),
 *   - never touches the student A4 pages, the teacher app, unit tests, or the PDF,
 *   - is hidden in print via an injected `@media print` rule (belt-and-suspenders).
 *
 * Controls:
 *   - "רענן עכשיו" / "אוטומטי": hard refresh, once or every few seconds (Vite HMR already
 *     updates the page on every save).
 *   - "מזהים": outlines every question and diagram and shows the content record behind it
 *     (data-task-id · data-task-kind), so a visual problem maps straight to its source.
 *   - Live QA: pages whose content overflows the A4 content area, and MathJax completeness.
 */

const HOST_ID = 'dev-refresh-bar-root';
const INSPECT_CLASS = 'dev-inspect';

function clock(): string {
  const d = new Date();
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const AUTO_INTERVAL_SECONDS = 3;
const QA_INTERVAL_MS = 2000;

type LiveQa = { clipped: string[]; mathTotal: number; mathDone: number };

/** Same measurement as the layout-health gate: content taller than the page content area. */
function measureLiveQa(): LiveQa {
  const clipped = [...document.querySelectorAll<HTMLElement>('.a4-page')]
    .filter(page => {
      const content = page.querySelector<HTMLElement>('.page-content');
      return content ? content.scrollHeight - content.clientHeight > 1 : false;
    })
    .map(page => page.dataset.pageId ?? `page-${page.dataset.page ?? '?'}`);
  const islands = document.querySelectorAll('bdi.math.mathjax-inline');
  const done = document.querySelectorAll('bdi.math.mathjax-inline mjx-container');
  return { clipped, mathTotal: islands.length, mathDone: done.length };
}

const buttonStyle = {
  cursor: 'pointer',
  borderRadius: '999px',
  padding: '5px 12px',
  font: 'inherit',
} as const;

function DevRefreshBar() {
  const [loadedAt] = useState(clock);
  const [auto, setAuto] = useState(false);
  const [remaining, setRemaining] = useState(AUTO_INTERVAL_SECONDS);
  const [inspect, setInspect] = useState(() => document.documentElement.classList.contains(INSPECT_CLASS));
  const [qa, setQa] = useState<LiveQa>(() => measureLiveQa());

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

  useEffect(() => {
    document.documentElement.classList.toggle(INSPECT_CLASS, inspect);
  }, [inspect]);

  useEffect(() => {
    const id = setInterval(() => setQa(measureLiveQa()), QA_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const mathPending = qa.mathDone < qa.mathTotal;
  const healthy = qa.clipped.length === 0;

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

      <span
        title={qa.clipped.length ? `עמודים שתוכנם חורג: ${qa.clipped.join(', ')}` : 'אין עמודים שתוכנם חורג מאזור התוכן'}
        style={{
          padding: '3px 9px',
          borderRadius: '999px',
          background: healthy ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.28)',
          color: healthy ? '#bbf7d0' : '#fecaca',
        }}
      >
        {healthy ? '✓ 0 חיתוכים' : `⚠ חיתוך: ${qa.clipped.join(', ')}`}
        {' · '}
        {mathPending ? `נוסחאות ${qa.mathDone}/${qa.mathTotal}…` : `${qa.mathTotal} נוסחאות`}
      </span>

      <button type="button" onClick={() => window.location.reload()} style={{ ...buttonStyle, border: 'none', background: '#38bdf8', color: '#082f49', fontWeight: 700 }}>
        רענן עכשיו
      </button>

      <button
        type="button"
        onClick={() => setAuto(value => !value)}
        aria-pressed={auto}
        style={{ ...buttonStyle, border: `1px solid ${auto ? '#f59e0b' : 'rgba(248,250,252,0.4)'}`, background: auto ? 'rgba(245,158,11,0.18)' : 'transparent', color: '#f8fafc' }}
      >
        {auto ? `אוטומטי (${remaining}s)` : 'אוטומטי'}
      </button>

      <button
        type="button"
        onClick={() => setInspect(value => !value)}
        aria-pressed={inspect}
        title="מסמן כל שאלה ושרטוט ומציג את רשומת התוכן שמאחוריהם"
        style={{ ...buttonStyle, border: `1px solid ${inspect ? '#a78bfa' : 'rgba(248,250,252,0.4)'}`, background: inspect ? 'rgba(167,139,250,0.22)' : 'transparent', color: '#f8fafc' }}
      >
        מזהים
      </button>
    </div>
  );
}

/** Dev-only styles: print hiding for the bar, and the inspect overlay. */
const DEV_STYLES = `
@media print { #${HOST_ID} { display: none !important; } }
html.${INSPECT_CLASS} [data-task-id] { position: relative; outline: 1px dashed #f59e0b; outline-offset: 2px; }
html.${INSPECT_CLASS} [data-task-id]::before {
  content: attr(data-task-id) " · " attr(data-task-kind);
  position: absolute; inset-block-start: -10px; inset-inline-end: 0; z-index: 5;
  direction: ltr; padding: 0 5px; border-radius: 3px;
  font: 600 10px/1.5 Consolas, "Courier New", monospace; color: #78350f; background: #fef3c7;
}
html.${INSPECT_CLASS} svg.geometry-diagram { outline: 1px dotted #0ea5e9; }
html.${INSPECT_CLASS} svg[data-line-relation="non-parallel"] { outline: 1px dotted #ef4444; }
html.${INSPECT_CLASS} [data-angle-role="given"] .angle-arc { stroke-width: 5; }
html.${INSPECT_CLASS} [data-angle-role="target"] .angle-arc { stroke-width: 5; }
`;

export function mountDevRefreshBar(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(HOST_ID)) return;

  const style = document.createElement('style');
  style.textContent = DEV_STYLES;
  document.head.appendChild(style);

  const host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  createRoot(host).render(<DevRefreshBar />);
}
