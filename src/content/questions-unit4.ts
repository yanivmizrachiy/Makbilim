import { REASONS, THEOREMS } from './theorems';

export type Unit4Question = {
  id: string;
  page: number;
  stem: string;
  subparts?: string[];
  choices?: string[];
  /** Response structure: the verdict the student marks beside each sub-item statement. */
  verdictOptions?: string[];
  /**
   * A guided deduction (SPEC 3.2 / 11.14): givens ↓ intermediate equality ↓ conclusion are printed,
   * joined by the shared ↓ arrow; the student completes the justification one word per line.
   */
  deduction?: {
    givens: string[];
    steps: string[];
    conclusion: string;
    reasonLines: string[];
  };
  diagram?: {
    topology: string;
    lineLabels: string[];
    pointLabels?: string[];
    orientationDeg: number;
    transversalDeg?: number;
    parallelGiven: boolean;
    parallelGivens?: string[];
    givens: string[];
    target: string;
  };
  justificationLane?: boolean;
  expected: {
    completions?: string[];
    choice?: string;
    values?: Record<string, string | number>;
    conclusion?: string;
    proof?: string[];
    reason?: string | string[];
    justification?: string | string[];
  };
};

export const unit4Questions: Unit4Question[] = [
  // עמוד 1 — שפה והפעלה ראשונה של המשפטים ההפוכים
  // Converse-wording drills: each line is the full canonical converse theorem with
  // exactly ONE word missing (never two blanks in one sentence — SPEC 3.1). The
  // lines cover the equality premise (שוות), the parallel conclusion (מקבילים) and
  // the angle-type word; expected.completions[i] fills subparts[i].
  {
    id: 'U4-P1-A',
    page: 1,
    stem: 'השלימו בכל שורה את המילה החסרה. בכל השורות מופיע אותו משפט הפוך.',
    subparts: [
      'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתאימות ______ זו לזו, אז שני הישרים מקבילים.',
      'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתאימות שוות זו לזו, אז שני הישרים ______.',
      'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות ______ שוות זו לזו, אז שני הישרים מקבילים.'
    ],
    expected: { completions: ['שוות', 'מקבילים', 'מתאימות'] }
  },
  {
    id: 'U4-P1-B',
    page: 1,
    stem: 'השלימו את המילה החסרה בכל שורה, כך שבכל השורות יתקבל אותו משפט הפוך.',
    subparts: [
      'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתחלפות שוות זו לזו, אז שני הישרים ______.',
      'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות ______ שוות זו לזו, אז שני הישרים מקבילים.',
      'אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתחלפות ______ זו לזו, אז שני הישרים מקבילים.'
    ],
    expected: { completions: ['מקבילים', 'מתחלפות', 'שוות'] }
  },
  {
    id: 'U4-P1-C',
    page: 2,
    stem: 'קבעו ליד כל טענה אם היא משפט ישיר או משפט הפוך.',
    // The canonical statements themselves (SPEC 3.1 / 3.2), taken from theorems.ts so they can never drift.
    subparts: [
      THEOREMS.correspondingDirect.formalText,
      THEOREMS.correspondingConverse.text,
      THEOREMS.alternateDirect.formalText,
      THEOREMS.alternateConverse.text
    ],
    verdictOptions: ['משפט ישיר', 'משפט הפוך'],
    expected: { completions: ['ישיר', 'הפוך', 'ישיר', 'הפוך'] }
  },
  {
    // Ids are internal and stable (SPEC 4.2); only the `page` field places a task. Page 1 ends with
    // this first guided chain (its diagram), page 2 holds the verdicts, the 112° chain and the
    // true/false, and page 3 the algebra and the proof.
    id: 'U4-P1-D',
    page: 1,
    stem: 'בשרטוט שני ישרים נחתכים על ידי ישר שלישי. נתון כי ∠A = 67° ו־∠B = 67°, והזוויות ∠A ו־∠B מתאימות. קבעו אם p ∥ q. נמקו.',
    diagram: {
      topology: 'converse-corresponding-equal-numeric',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B'],
      orientationDeg: 6,
      transversalDeg: 73,
      parallelGiven: false,
      givens: ['∠A = 67°', '∠B = 67°', '∠A and ∠B are corresponding'],
      target: 'determine p ∥ q'
    },
    // First converse application: the whole chain is printed; the student completes the converse
    // one word per line (the stem names the pair type — the type word is a recall here).
    deduction: {
      givens: ['∠A = 67°', '∠B = 67°'],
      steps: ['∠A = ∠B'],
      conclusion: 'p ∥ q',
      reasonLines: ['אם זוג זוויות ______ שוות זו לזו,', 'אז שני הישרים ______.']
    },
    expected: {
      completions: ['מתאימות', 'מקבילים'],
      conclusion: 'p ∥ q',
      reason: THEOREMS.correspondingConverse.text
    }
  },
  {
    id: 'U4-P2-A',
    page: 2,
    // The pair type is NOT named: the student identifies it from the drawing (the arcs sit on
    // opposite sides of r, between k and m) and must then choose the matching converse.
    stem: 'בשרטוט הישרים k ו־m נחתכים על ידי הישר r. נתון כי ∠C = 112° ו־∠D = 112°. ציינו אם ∠C ו־∠D הן זוויות מתאימות או מתחלפות, וקבעו אם k ∥ m. נמקו.',
    diagram: {
      topology: 'converse-alternate-equal-numeric',
      lineLabels: ['k', 'm', 'r'],
      pointLabels: ['C', 'D'],
      orientationDeg: -13,
      transversalDeg: 99,
      parallelGiven: false,
      givens: ['∠C = 112°', '∠D = 112°'],
      target: 'identify the pair type, then determine k ∥ m'
    },
    // The guided 112° example (SPEC 3.2): ∠C = 112°, ∠D = 112° ↓ ∠C = ∠D ↓ k ∥ m. The pair type is
    // NOT named anywhere: identifying it from the drawing is what fills the first blank.
    deduction: {
      givens: ['∠C = 112°', '∠D = 112°'],
      steps: ['∠C = ∠D'],
      // Graded scaffolding (SPEC 3.2): the first chain prints its conclusion as a model; here the
      // student writes the conclusion after the last ↓.
      conclusion: '______',
      reasonLines: ['אם זוג זוויות ______ שוות זו לזו,', 'אז שני הישרים ______.']
    },
    expected: {
      completions: ['מתחלפות', 'מקבילים'],
      conclusion: 'k ∥ m',
      reason: [
        '∠C ו־∠D הן זוויות מתחלפות.',
        THEOREMS.alternateConverse.text
      ]
    }
  },
  {
    id: 'U4-P2-B',
    page: 2,
    // True / false on the converse theorems (SPEC 4, unit 4): which data suffice to conclude p ∥ q.
    // Two claims are converse conditions (corresponding equal; co-interior supplementary — SPEC 3.2
    // no. 6, set against the adjacent pair of ד); the other three rest on facts that hold for ANY two lines
    // cut by a transversal (vertical, adjacent) or on the position of a pair without its equality.
    stem: 'הישר t חותך את p ו־q. קבעו אם כל טענה נכונה, ונמקו.',
    subparts: [
      'אם זוג זוויות קודקודיות בחיתוך של p ו־t שוות זו לזו, אז p ו־q מקבילים.',
      'אם זוג זוויות מתאימות בין p ו־q שוות זו לזו, אז p ו־q מקבילים.',
      'אם שתי זוויות הן זוויות מתחלפות בין p ו־q, אז p ו־q מקבילים.',
      'אם זוויות צמודות בחיתוך של q ו־t משלימות ל־180°, אז p ו־q מקבילים.',
      'אם זוג זוויות חד-צדדיות בין p ו־q משלימות ל־180°, אז p ו־q מקבילים.'
    ],
    verdictOptions: ['נכון', 'לא נכון'],
    expected: {
      reason: [
        `לא נכון — ${REASONS.vertical} זה מתקיים תמיד, גם כשהישרים אינם מקבילים, ושתי הזוויות באותו חיתוך; אין בכך מידע על הישר q.`,
        `נכון — ${THEOREMS.correspondingConverse.text}`,
        `לא נכון — בכל שני ישרים הנחתכים על ידי ישר שלישי יש זוויות מתחלפות; המיקום לבדו אינו מספיק. המשפט ההפוך דורש שהזוויות המתחלפות יהיו שוות זו לזו.`,
        `לא נכון — ${REASONS.adjacent} זה מתקיים תמיד, גם כשהישרים אינם מקבילים, ושתי הזוויות באותו חיתוך; אין בכך מידע על הישר p.`,
        `נכון — ${THEOREMS.coInteriorConverse.text}`
      ]
    }
  },
  {
    id: 'U4-P2-C',
    page: 3,
    stem: 'הישרים p ו־q נחתכים על ידי ישר שלישי. גודלי שתי זוויות מתאימות הם 3x + 14° ו־5x − 26°. מצאו את x כך שניתן יהיה לקבוע כי p ∥ q, וחשבו את גודל הזוויות המתאימות עבור x זה. נמקו.',
    diagram: {
      topology: 'converse-algebra-corresponding',
      lineLabels: ['p', 'q', 't'],
      // Rising lines (the unit's one non-horizontal pose); crossing 74° = the angle at x = 20, so
      // the drawn acute pair shows its true size.
      orientationDeg: 28,
      transversalDeg: 134,
      parallelGiven: false,
      givens: ['corresponding angles: 3x + 14° and 5x − 26°'],
      target: 'find x that guarantees p ∥ q'
    },
    justificationLane: true,
    expected: {
      // SPEC 7: the work ends at the angle — x = 20, then the corresponding angles are 74°.
      values: { x: 20, 'זווית': 74 },
      justification: THEOREMS.correspondingConverse.text,
      conclusion: 'p ∥ q',
      reason: [
        'כדי להפעיל את המשפט ההפוך של הזוויות המתאימות, דורשים ששתי הזוויות המתאימות יהיו שוות: 3x + 14 = 5x − 26.',
        '40 = 2x, ולכן x = 20.',
        'בדיקה: עבור x = 20 שתי הזוויות שוות ל־74°. זוג זוויות מתאימות שוות זו לזו, ולכן p ∥ q.'
      ]
    }
  },
  {
    id: 'U4-P2-D',
    page: 3,
    stem: 'נתון p ∥ q. בשרטוט ∠A מתאימה ל־∠B, ונתון גם כי ∠A = ∠C. הזוויות ∠B ו־∠C מתאימות ביחס לישרים q ו־r. הוכיחו כי q ∥ r.',
    diagram: {
      topology: 'combined-direct-and-converse-three-lines',
      lineLabels: ['p', 'q', 'r', 't'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 12,
      // A shallow (42°) crossing: the proof names no sizes, and the wide obtuse sectors hold A, B, C.
      transversalDeg: 54,
      parallelGiven: true,
      parallelGivens: ['p ∥ q'],
      givens: ['p ∥ q', '∠A corresponds to ∠B', '∠A = ∠C', '∠B and ∠C are corresponding relative to q and r'],
      target: 'prove q ∥ r'
    },
    expected: {
      conclusion: 'q ∥ r',
      proof: [
        // Direct theorem on the GIVEN p ∥ q (stated in the stem), then the converse on q and r.
        `∠A = ∠B — ${THEOREMS.correspondingDirect.text} (p ∥ q נתון)`,
        `∠A = ∠C — ${REASONS.given}`,
        `∠B = ∠C — ${REASONS.transitivity}`,
        `∠B ו־∠C הן זוויות מתאימות ביחס לישרים q ו־r — ${REASONS.given}`,
        `q ∥ r — ${THEOREMS.correspondingConverse.text}`
      ]
    }
  }
];
