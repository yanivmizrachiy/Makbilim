export const THEOREMS = {
  correspondingDirect: {
    id: 'corresponding-direct',
    text: 'זוויות מתאימות בין ישרים מקבילים שוות.',
    /** The full conditional statement (SPEC 3.1), e.g. for classifying direct vs converse. */
    formalText: 'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, אז כל זוג זוויות מתאימות שוות זו לזו.',
    requiresParallelGiven: true,
    direction: 'direct'
  },
  alternateDirect: {
    id: 'alternate-direct',
    text: 'זוויות מתחלפות בין ישרים מקבילים שוות.',
    formalText: 'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, אז כל זוג זוויות מתחלפות שוות זו לזו.',
    requiresParallelGiven: true,
    direction: 'direct'
  },
  correspondingConverse: {
    id: 'corresponding-converse',
    text: 'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתאימות שוות זו לזו, אז שני הישרים מקבילים.',
    concludesParallel: true,
    direction: 'converse'
  },
  alternateConverse: {
    id: 'alternate-converse',
    text: 'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתחלפות שוות זו לזו, אז שני הישרים מקבילים.',
    concludesParallel: true,
    direction: 'converse'
  }
} as const;

export const THEOREM_GUARDRAILS = {
  forbiddenStandaloneClaims: [
    'זוויות מתחלפות שוות',
    'זוויות מתאימות שוות'
  ],
  distinction: 'זיהוי זוג זוויות מתאימות או מתחלפות מתאר את מיקומן; שוויון נובע במשפט הישיר רק כאשר נתון שהישרים מקבילים.',
  conversePlacement: 'משפטים הפוכים נלמדים רק ביחידה המתקדמת לאחר שליטה במשפטים הישירים.'
} as const;
