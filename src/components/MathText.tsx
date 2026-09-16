import React, { useEffect, useRef } from 'react';

type MathJaxRuntime = {
  startup?: { promise?: Promise<unknown>; typeset?: boolean };
  tex?: Record<string, unknown>;
  svg?: Record<string, unknown>;
  typesetClear?: (elements: Element[]) => void;
  typesetPromise?: (elements: Element[]) => Promise<unknown>;
};

type MathJaxWindow = Window & { MathJax?: MathJaxRuntime };

let mathJaxReady: Promise<MathJaxRuntime> | null = null;

const mathToken = /(\([^)]*[A-Za-z0-9Α-Ωα-ω][^)]*\)°?|∠[A-Za-zΑ-Ωα-ω]+(?:\s*=\s*(?:\([^)]*\)°?|\d+°))?|[A-Za-zℓ][A-Za-z0-9₁₂₃]*\s*∥\s*[A-Za-zℓ][A-Za-z0-9₁₂₃]*|\d*[xy]\s*[+\-−]\s*\d+(?:\s*=\s*[\dxy()+\-−=°\s]+)?|\b[xy]\b|\d+°|[α-ωΑ-Ω])/g;
const mathTokenCheck = new RegExp(`^(?:${mathToken.source})$`);

const texCharacters: Record<string, string> = {
  '∠': '\\angle ',
  '∥': '\\parallel ',
  '°': '^{\\circ}',
  'ℓ': '\\ell ',
  '₁': '_{1}',
  '₂': '_{2}',
  '₃': '_{3}',
  'α': '\\alpha ',
  'β': '\\beta ',
  'γ': '\\gamma ',
  'δ': '\\delta ',
  'ε': '\\epsilon ',
  'ζ': '\\zeta ',
  'η': '\\eta ',
  'θ': '\\theta ',
  'ι': '\\iota ',
  'κ': '\\kappa ',
  'λ': '\\lambda ',
  'μ': '\\mu ',
  'ν': '\\nu ',
  'ξ': '\\xi ',
  'π': '\\pi ',
  'ρ': '\\rho ',
  'σ': '\\sigma ',
  'τ': '\\tau ',
  'υ': '\\upsilon ',
  'φ': '\\phi ',
  'χ': '\\chi ',
  'ψ': '\\psi ',
  'ω': '\\omega ',
  'Γ': '\\Gamma ',
  'Δ': '\\Delta ',
  'Θ': '\\Theta ',
  'Λ': '\\Lambda ',
  'Ξ': '\\Xi ',
  'Π': '\\Pi ',
  'Σ': '\\Sigma ',
  'Υ': '\\Upsilon ',
  'Φ': '\\Phi ',
  'Ψ': '\\Psi ',
  'Ω': '\\Omega ',
  '−': '-',
};

function toTeX(value: string) {
  return [...value].map(character => texCharacters[character] ?? character).join('').trim();
}

function ensureMathJax(): Promise<MathJaxRuntime> {
  const runtime = window as MathJaxWindow;
  if (runtime.MathJax?.typesetPromise) return Promise.resolve(runtime.MathJax);
  if (mathJaxReady) return mathJaxReady;

  runtime.MathJax = {
    ...(runtime.MathJax ?? {}),
    tex: {
      inlineMath: [['\\(', '\\)']],
      processEscapes: true,
    },
    svg: {
      fontCache: 'global',
    },
    startup: {
      ...(runtime.MathJax?.startup ?? {}),
      typeset: false,
    },
  };

  const pending = new Promise<MathJaxRuntime>((resolve, reject) => {
    const finish = async () => {
      try {
        await runtime.MathJax?.startup?.promise;
        if (!runtime.MathJax?.typesetPromise) throw new Error('MathJax loaded without typesetPromise');
        resolve(runtime.MathJax);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const existing = document.getElementById('mathjax-script') as HTMLScriptElement | null;
    if (existing) {
      if (runtime.MathJax?.typesetPromise) {
        void finish();
      } else {
        existing.addEventListener('load', () => void finish(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load MathJax')), { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'mathjax-script';
    script.defer = true;
    script.src = new URL('vendor/mathjax/tex-svg.js', document.baseURI).toString();
    script.addEventListener('load', () => void finish(), { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load MathJax from ${script.src}`)), { once: true });
    document.head.appendChild(script);
  });

  mathJaxReady = pending.catch(error => {
    mathJaxReady = null;
    throw error;
  });
  return mathJaxReady;
}

function MathInline({ source }: { source: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tex = toTeX(source);

  useEffect(() => {
    let cancelled = false;
    void ensureMathJax()
      .then(async mathJax => {
        if (cancelled || !ref.current) return;
        mathJax.typesetClear?.([ref.current]);
        await mathJax.typesetPromise?.([ref.current]);
        if (!cancelled && ref.current) ref.current.dataset.mathjax = 'svg';
      })
      .catch(error => {
        if (!cancelled) console.error('MathJax typesetting failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, [tex]);

  return (
    <bdi className="math mathjax-inline" dir="ltr">
      <span ref={ref} aria-label={source}>{`\\(${tex}\\)`}</span>
    </bdi>
  );
}

export function MathText({ text }: { text: string }) {
  const parts = text.split(mathToken).filter(part => part.length > 0);
  return (
    <>
      {parts.map((part, index) => (
        mathTokenCheck.test(part)
          ? <MathInline source={part} key={`${index}-${part}`} />
          : <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>
      ))}
    </>
  );
}
