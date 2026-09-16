export type Unit1Question = {
  id: string;
  page: number;
  stem: string;
  subparts?: string[];
  choices?: string[];
  diagram: {
    topology: string;
    lineLabels: string[];
    pointLabels?: string[];
    orientationDeg: number;
    transversalDeg: number;
    parallelGiven: boolean;
    highlights?: string[];
  };
};

export const unit1Questions: Unit1Question[] = [
  {
    id: 'U1-P1-A',
    page: 1,
    stem: 'בסרטוט שלפניכם שני ישרים וישר נוסף החותך את שניהם. סמנו את הישר החותך.',
    diagram: { topology: 'two-lines-one-transversal', lineLabels: ['p', 'q', 'r'], orientationDeg: 0, transversalDeg: 58, parallelGiven: false }
  },
  {
    id: 'U1-P1-B', page: 1, stem: 'סמנו בשרטוט את הזווית המתאימה לזווית המסומנת.',
    diagram: { topology: 'two-lines-one-transversal-one-angle-highlighted', lineLabels: ['k', 'm', 't'], pointLabels: ['A', 'B'], orientationDeg: 4, transversalDeg: 63, parallelGiven: false, highlights: ['given-angle'] }
  },
  {
    id: 'U1-P1-C', page: 1, stem: 'סמנו בשרטוט את הזווית המתחלפת לזווית המסומנת.',
    diagram: { topology: 'two-lines-one-transversal-one-angle-highlighted', lineLabels: ['a', 'b', 's'], pointLabels: ['C', 'D'], orientationDeg: -7, transversalDeg: 116, parallelGiven: false, highlights: ['given-angle'] }
  },
  {
    id: 'U1-P1-D', page: 1,
    stem: 'כתבו ליד כל זוג זוויות אם הן מתאימות, מתחלפות או אינן שייכות לאחד משני הסוגים.',
    subparts: ['הזוג המסומן בקשת אחת.', 'הזוג המסומן בשתי קשתות.', 'הזוג המסומן בקשת מקווקוות.'],
    diagram: { topology: 'three-marked-angle-pairs', lineLabels: ['u', 'v', 'w'], pointLabels: ['E', 'F'], orientationDeg: 11, transversalDeg: 71, parallelGiven: false, highlights: ['single-arc', 'double-arc', 'dashed-arc'] }
  },
  {
    id: 'U1-P1-E', page: 1, stem: 'התאימו לכל זווית בטור הימני את הזווית המתאימה לה בטור השמאלי.',
    diagram: { topology: 'eight-angle-labeled-grid', lineLabels: ['c', 'd', 'h'], pointLabels: ['K', 'L'], orientationDeg: -3, transversalDeg: 52, parallelGiven: false }
  },
  {
    id: 'U1-P2-A', page: 2, stem: 'התאימו לכל זווית בטור הימני את הזווית המתחלפת לה בטור השמאלי.',
    diagram: { topology: 'eight-angle-labeled-grid', lineLabels: ['g', 'j', 'n'], pointLabels: ['M', 'N'], orientationDeg: 19, transversalDeg: 101, parallelGiven: false }
  },
  {
    id: 'U1-P2-B', page: 2,
    stem: 'כתבו ליד כל זוג זוויות אם הן מתאימות, מתחלפות או אינן שייכות לאחד משני הסוגים.',
    subparts: ['הזוג המסומן בקשת אחת.', 'הזוג המסומן בשתי קשתות.', 'הזוג המסומן בקשת מקווקוות.'],
    diagram: { topology: 'rotated-three-pair-classification', lineLabels: ['ℓ₁', 'ℓ₂', 'r'], pointLabels: ['P', 'R'], orientationDeg: 78, transversalDeg: 24, parallelGiven: false, highlights: ['single-arc', 'double-arc', 'dashed-arc'] }
  },
  {
    id: 'U1-P2-C', page: 2, stem: 'השלימו את המשפט: אם שני ישרים ______ נחתכים על ידי ישר שלישי, אז כל זוג זוויות מתאימות ______ זו לזו.',
    diagram: { topology: 'minimal-theorem-support', lineLabels: ['e', 'f', 'z'], orientationDeg: 8, transversalDeg: 67, parallelGiven: true }
  },
  {
    id: 'U1-P2-D', page: 2, stem: 'השלימו את המשפט: אם שני ישרים ______ נחתכים על ידי ישר שלישי, אז כל זוג זוויות מתחלפות ______ זו לזו.',
    diagram: { topology: 'minimal-theorem-support', lineLabels: ['x', 'y', 'v'], orientationDeg: -14, transversalDeg: 109, parallelGiven: true }
  },
  {
    id: 'U1-P2-E', page: 2, stem: 'קבעו אם הטענה נכונה או לא נכונה. נמקו.',
    subparts: ['כל שתי זוויות מתחלפות שוות זו לזו.', 'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, הזוויות המתחלפות שוות זו לזו.', 'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, הזוויות המתאימות שוות זו לזו.'],
    diagram: { topology: 'statement-only-with-small-reference-diagram', lineLabels: ['r', 's', 't'], orientationDeg: 0, transversalDeg: 64, parallelGiven: true }
  },
  {
    id: 'U1-P3-A', page: 3, stem: 'דניאל אמר: „זוויות מתחלפות שוות זו לזו.” נועה אמרה: „הטענה אינה מדויקת; השוויון מובטח כאשר הישרים מקבילים.” קבעו מי צודק ונמקו.',
    diagram: { topology: 'claim-analysis-two-configurations', lineLabels: ['m', 'n', 'q'], orientationDeg: 13, transversalDeg: 73, parallelGiven: false }
  },
  {
    id: 'U1-P3-B', page: 3, stem: 'השלימו את הטבלה לפי השרטוטים.',
    subparts: ['קבעו בכל שורה אם הזוג המסומן הוא זוג זוויות מתאימות או זוג זוויות מתחלפות.', 'קבעו אם ניתן להסיק שהזוויות שוות על סמך הנתונים שבשרטוט.'],
    diagram: { topology: 'four-mini-diagrams-table', lineLabels: ['a', 'c', 'p'], orientationDeg: 32, transversalDeg: 122, parallelGiven: false }
  },
  {
    id: 'U1-P3-C', page: 3, stem: 'בחרו את זוג הזוויות המתחלפות.',
    choices: ['הזוג המסומן א', 'הזוג המסומן ב', 'הזוג המסומן ג', 'הזוג המסומן ד'],
    diagram: { topology: 'rotated-four-option-angle-pairs', lineLabels: ['b', 'd', 'f'], pointLabels: ['S', 'T'], orientationDeg: 84, transversalDeg: 29, parallelGiven: false, highlights: ['option-a', 'option-b', 'option-c', 'option-d'] }
  },
  {
    id: 'U1-P3-D', page: 3, stem: 'במשפט שלפניכם חסר תנאי הכרחי: „זוויות מתאימות שוות זו לזו.” כתבו את המשפט המלא והמדויק.',
    diagram: { topology: 'two-configurations-one-parallel-one-not', lineLabels: ['h', 'k', 's'], orientationDeg: -21, transversalDeg: 48, parallelGiven: false }
  }
];
