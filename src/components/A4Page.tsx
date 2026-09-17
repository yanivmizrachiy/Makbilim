import React, { type ReactNode } from 'react';
import { printTokens } from '../styles/tokens';

export type A4PageProps = {
  projectTitle?: string;
  unitNumber: number;
  unitTitle: string;
  pageNumber: number;
  children: ReactNode;
  className?: string;
};

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
      data-layout-quality="premium"
      dir="rtl"
    >
      <header className="page-header">
        <div className="page-title-group">
          <h1>{projectTitle}</h1>
          <div className="unit-title">יחידה {unitNumber} — {unitTitle}</div>
        </div>
        <div className="page-number" aria-label={`עמוד ${pageNumber}`}>עמוד {pageNumber}</div>
      </header>

      <main className="page-content">{children}</main>

      <footer className="page-footer">
        <div>{printTokens.footer.line1}</div>
        <div>{printTokens.footer.line2}</div>
      </footer>
    </article>
  );
}
