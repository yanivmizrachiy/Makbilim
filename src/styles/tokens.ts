export const printTokens = {
  page: {
    widthMm: 210,
    heightMm: 297,
    numbering: 'reset-per-unit' as const,
    firstPageInUnit: 1,
  },
  markers: {
    question: {
      glyph: '●',
      sizeEm: 0.82,
      role: 'large-solid-bullet' as const,
      ariaLabel: 'שאלה',
    },
    subpart: {
      glyph: '•',
      sizeEm: 0.50,
      role: 'small-solid-bullet' as const,
      ariaLabel: 'סעיף',
    },
    numbering: 'none' as const,
  },
  footer: {
    line1: 'יניב רז - מדריך מחוזי חט"ב בעיר ירושלים',
    line2: 'הדרכה במחוז ירושלים והעיר ירושלים - מנח"י, בהובלת איילת קריספין',
  },
} as const;

export type PrintTokens = typeof printTokens;
