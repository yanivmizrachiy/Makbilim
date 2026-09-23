import { THEOREMS } from './theorems';

/**
 * The parallel-arrow convention, stated in words where the arrows first appear (U1-P2-C) and in
 * every unit-1 task whose answer depends on reading them (U1-P3-B).
 */
export const PARALLEL_ARROWS_CONVENTION = 'חצים זהים על שני ישרים מסמנים שהישרים מקבילים.';

export type Unit1Question = {
  id: string;
  page: number;
  stem: string;
  subparts?: string[];
  choices?: string[];
  /** Response structure: the verdict the student marks beside each sub-item statement. */
  verdictOptions?: string[];
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
    stem: 'בשרטוט שלפניכם שני ישרים וישר נוסף החותך את שניהם. סמנו את הישר החותך.',
    diagram: { topology: 'two-lines-one-transversal', lineLabels: ['p', 'q', 'r'], orientationDeg: 0, transversalDeg: 50, parallelGiven: false }
  },
  {
    id: 'U1-P1-B', page: 1, stem: 'סמנו בשרטוט את הזווית המתאימה לזווית המסומנת.',
    diagram: { topology: 'two-lines-one-transversal-one-angle-highlighted', lineLabels: ['k', 'm', 't'], pointLabels: ['A', 'B'], orientationDeg: 4, transversalDeg: 142, parallelGiven: false, highlights: ['given-angle'] }
  },
  {
    id: 'U1-P1-C', page: 1, stem: 'סמנו בשרטוט את הזווית המתחלפת לזווית המסומנת.',
    diagram: { topology: 'two-lines-one-transversal-one-angle-highlighted', lineLabels: ['a', 'b', 's'], pointLabels: ['C', 'D'], orientationDeg: -7, transversalDeg: 101, parallelGiven: false, highlights: ['given-angle'] }
  },
  {
    id: 'U1-P1-D', page: 1,
    stem: 'כתבו ליד כל זוג זוויות אם הן מתאימות, מתחלפות או אינן שייכות לאחד משני הסוגים.',
    subparts: ['הזוג המסומן בקשת אחת.', 'הזוג המסומן בשתי קשתות.', 'הזוג המסומן בקשת מקווקוות.'],
    diagram: { topology: 'three-marked-angle-pairs', lineLabels: ['u', 'v', 'w'], pointLabels: ['E', 'F'], orientationDeg: 11, transversalDeg: 71, parallelGiven: false, highlights: ['single-arc', 'double-arc', 'dashed-arc'] }
  },
  {
    id: 'U1-P1-E', page: 2, stem: 'התאימו לכל זווית בטור הימני את הזווית המתאימה לה בטור השמאלי.',
    diagram: { topology: 'eight-angle-labeled-grid', lineLabels: ['c', 'd', 'h'], pointLabels: ['K', 'L'], orientationDeg: -3, transversalDeg: 52, parallelGiven: false }
  },
  {
    id: 'U1-P2-A', page: 2, stem: 'התאימו לכל זווית בטור הימני את הזווית המתחלפת לה בטור השמאלי.',
    diagram: { topology: 'eight-angle-labeled-grid', lineLabels: ['g', 'j', 'n'], pointLabels: ['M', 'N'], orientationDeg: 19, transversalDeg: 95, parallelGiven: false }
  },
  {
    id: 'U1-P2-B', page: 2,
    stem: 'בשרטוט שלפניכם סמנו בעצמכם זוג אחד של זוויות מתאימות וזוג אחד של זוויות מתחלפות.',
    subparts: ['רשמו זוג אחד של זוויות מתאימות.', 'רשמו זוג אחד של זוויות מתחלפות.', 'הסבירו בקצרה כיצד זיהיתם כל זוג לפי מיקומו ביחס לישרים ולישר החותך.'],
    diagram: { topology: 'rotated-eight-angle-construction', lineLabels: ['ℓ₁', 'ℓ₂', 'r'], pointLabels: ['P', 'R'], orientationDeg: 78, transversalDeg: 21, parallelGiven: false }
  },
  // Theorem-wording drills (SPEC 3.1): every line is one of the two canonical direct theorems
  // with exactly ONE word missing, and the missing word rotates so that the student writes each
  // key word — מתאימות, מתחלפות, מקבילים, שוות — at least once. Each task mixes BOTH theorems, so
  // the other lines never give the angle-type word away: the first line's blank (the angle type)
  // is decided only by the pair marked in the drawing, which the instruction points to.
  {
    id: 'U1-P2-C', page: 2, stem: `בשרטוט מסומן זוג זוויות. ${PARALLEL_ARROWS_CONVENTION} השלימו בכל שורה מילה אחת. בשורה הראשונה השלימו את סוג הזוויות לפי הזוג המסומן בשרטוט.`,
    subparts: [
      'זוויות ______ בין ישרים מקבילים שוות.',
      'זוויות מתאימות בין ישרים ______ שוות.',
      'זוויות מתחלפות בין ישרים מקבילים ______.'
    ],
    diagram: { topology: 'minimal-theorem-support', lineLabels: ['e', 'f', 'z'], orientationDeg: 8, transversalDeg: 138, parallelGiven: true }
  },
  {
    id: 'U1-P2-D', page: 3, stem: 'בשרטוט מסומן זוג זוויות. השלימו בכל שורה מילה אחת. בשורה הראשונה השלימו את סוג הזוויות לפי הזוג המסומן בשרטוט.',
    subparts: [
      'זוויות ______ בין ישרים מקבילים שוות.',
      'זוויות מתחלפות בין ישרים מקבילים ______.',
      'זוויות מתאימות בין ישרים ______ שוות.'
    ],
    diagram: { topology: 'minimal-theorem-support', lineLabels: ['x', 'y', 'v'], orientationDeg: -14, transversalDeg: 109, parallelGiven: true }
  },
  {
    id: 'U1-P2-E', page: 3, stem: 'קבעו לגבי כל טענה אם היא נכונה או לא נכונה. נמקו.',
    subparts: ['זוויות מתחלפות שוות.', THEOREMS.alternateDirect.text, THEOREMS.correspondingDirect.text],
    verdictOptions: ['נכון', 'לא נכון'],
    diagram: { topology: 'statement-only-with-small-reference-diagram', lineLabels: ['r', 's', 't'], orientationDeg: 0, transversalDeg: 64, parallelGiven: true }
  },
  {
    id: 'U1-P3-A', page: 3, stem: `בכל אחד משני השרטוטים מסומן זוג זוויות מתחלפות. בשרטוט אחד הישרים m ו־n מקבילים (מסומנים בחצים), ובשרטוט השני הם אינם מקבילים. דניאל אמר: „בשני השרטוטים הזוויות המסומנות שוות, כי זוויות מתחלפות שוות.” נועה אמרה: „זה לא מדויק: ${THEOREMS.alternateDirect.text}” קבעו מי צודק. ציינו באיזה שרטוט אפשר לקבוע שהזוויות המסומנות שוות, ונמקו.`,
    diagram: { topology: 'claim-analysis-two-configurations', lineLabels: ['m', 'n', 'q'], orientationDeg: 13, transversalDeg: 63, parallelGiven: false }
  },
  {
    id: 'U1-P3-B', page: 4,
    // The whole instruction sits above the table; the column headings name what each cell asks.
    stem: `השלימו את הטבלה לפי השרטוטים. ${PARALLEL_ARROWS_CONVENTION} כשאין חצים — לא נתון שהישרים מקבילים, גם אם הם נראים מקבילים.`,
    diagram: { topology: 'four-mini-diagrams-table', lineLabels: ['a', 'c', 'p'], orientationDeg: 31, transversalDeg: 107, parallelGiven: false }
  },
  {
    id: 'U1-P3-C', page: 4, stem: 'בחרו את זוג הזוויות המתחלפות.',
    choices: ['הזוג המסומן א', 'הזוג המסומן ב', 'הזוג המסומן ג', 'הזוג המסומן ד'],
    diagram: { topology: 'rotated-four-option-angle-pairs', lineLabels: ['b', 'd', 'f'], pointLabels: ['S', 'T'], orientationDeg: 84, transversalDeg: 151, parallelGiven: false, highlights: ['option-a', 'option-b', 'option-c', 'option-d'] }
  },
  {
    id: 'U1-P3-D', page: 4, stem: 'בכל אחד משני השרטוטים מסומן זוג זוויות מתאימות. מאיה אמרה: „זוויות מתאימות שוות.” יואב טען שחסר במשפט תנאי הכרחי. כתבו את המשפט המדויק והסבירו, בעזרת השרטוטים, מה היה חסר.',
    diagram: { topology: 'two-configurations-one-parallel-one-not', lineLabels: ['h', 'k', 's'], orientationDeg: -21, transversalDeg: 48, parallelGiven: false }
  },

  // ── נושא הפתיחה: הגדרות, שמונה הזוויות וזוויות חד-צדדיות (SPEC 3.5 / 3.1 / 4.3). ──
  // בסדר החוברת עמוד זה פותח את הנושאים הדידקטיים (מיד אחרי תוכנית הלימודים), לכן משימותיו
  // מופיעות ראשונות במערך היחידה ובתוכנית השאלות.
  {
    id: 'U1-P5-A', page: 5,
    stem: 'השלימו את ההגדרות. היעזרו במחסן המילים.',
    subparts: [
      'ישרים מקבילים הם ישרים במישור שאין להם נקודות ______.',
      'שני קטעים נקראים מקבילים אם הם נמצאים על ישרים ______.'
    ],
    diagram: { topology: 'parallel-lines-definition', lineLabels: ['a', 'b', 'c'], orientationDeg: -2, transversalDeg: 136, parallelGiven: true }
  },
  {
    id: 'U1-P5-B', page: 5,
    stem: 'בשרטוט שני ישרים מקבילים וישר שלישי החותך אותם. סמנו את שמונה הזוויות שנוצרו בשני המפגשים.',
    diagram: { topology: 'eight-angles-emphasis', lineLabels: ['p', 'q', 't'], pointLabels: ['A', 'B'], orientationDeg: -4, transversalDeg: 116, parallelGiven: true }
  },
  {
    id: 'U1-P5-C', page: 5,
    stem: `בשרטוט מסומן זוג זוויות חד-צדדיות. ${PARALLEL_ARROWS_CONVENTION} השלימו בכל שורה מילה אחת.`,
    subparts: [
      'זוויות חד-צדדיות בין ישרים מקבילים משלימות ל־______.',
      'זוויות ______ בין ישרים מקבילים משלימות ל־180°.'
    ],
    diagram: { topology: 'cointerior-support', lineLabels: ['k', 'm', 'r'], orientationDeg: -11, transversalDeg: 57, parallelGiven: true }
  },
  {
    id: 'U1-P5-D', page: 5,
    stem: 'לפניכם שלוש טענות על זוגות זוויות בין ישרים מקבילים. קבעו לגבי כל טענה אם היא נכונה או לא נכונה. נמקו.',
    subparts: [
      'זוויות חד-צדדיות בין ישרים מקבילים הן שוות זו לזו.',
      'זוויות חד-צדדיות בין ישרים מקבילים משלימות ל־180°.',
      'זוויות מתחלפות בין ישרים מקבילים משלימות ל־180°.'
    ],
    verdictOptions: ['נכון', 'לא נכון'],
    diagram: { topology: 'statement-only-with-small-reference-diagram', lineLabels: ['r', 's', 't'], orientationDeg: 0, transversalDeg: 71, parallelGiven: true }
  }
];
