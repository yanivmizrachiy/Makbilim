import { type ReactNode } from 'react';
import { pageDensity } from '../content/page-layout';
import { printTokens } from '../styles/tokens';

export type A4PageProps = {
  projectTitle?: string;
  unitNumber: number;
  unitTitle: string;
  pageNumber: number;
  children: ReactNode;
  className?: string;
};

/**
 * One A4 sheet: header (the unit leads; the project title is a quiet running head; the local page
 * number), the content area and the canonical two-line footer. The header and footer TEXTS are
 * canonical (the visual baseline compares them); only their typography lives in CSS.
 */
export function A4Page({
  projectTitle = 'זוויות בין ישרים מקבילים',
  unitNumber,
  unitTitle,
  pageNumber,
  children,
  className = '',
}: A4PageProps) {
  return (
    <article
      className={`a4-page ${className}`.trim()}
      data-unit={unitNumber}
      data-page={pageNumber}
      data-density={pageDensity(unitNumber, pageNumber)}
      data-layout-quality="premium"
      dir="rtl"
    >
      <header className="page-header">
        <div className="page-title-group">
          <h1>{projectTitle}</h1>
          <div className="unit-title"><span className="unit-no">יחידה {unitNumber}</span> — <span className="unit-name">{unitTitle}</span></div>
        </div>
        <div className="page-number" aria-label={`עמוד ${pageNumber}`}>עמוד {pageNumber}</div>
      </header>

      <div className="page-content" role="group" aria-label={`תוכן עמוד ${pageNumber}`}>{children}</div>

      <footer className="page-footer">
        <div>{printTokens.footer.line1}</div>
        <div>{printTokens.footer.line2}</div>
      </footer>
    </article>
  );
}
