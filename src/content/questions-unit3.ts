import { REASONS, THEOREMS } from './theorems';

/** Every reason a unit-3 task prints or its key cites is one of these constants — never a retyped variant. */
const CORRESPONDING = THEOREMS.correspondingDirect.text;
const ALTERNATE = THEOREMS.alternateDirect.text;
const VERTICAL = REASONS.vertical;
const ADJACENT = REASONS.adjacent;
const TRANSITIVITY = REASONS.transitivity;
const GIVEN = REASONS.given;

export type Unit3Question = {
  id: string;
  page: number;
  stem: string;
  subparts?: string[];
  choices?: string[];
  proofLines?: Array<{ claim: string; reason?: string }>;
  diagram: {
    topology: string;
    lineLabels: string[];
    pointLabels?: string[];
    orientationDeg: number;
    transversalDeg?: number;
    secondaryTransversalDeg?: number;
    parallelGivens: string[];
    givens?: string[];
    target: string;
  };
  /**
   * U3-P2-B: every order the student may write in the 'סדר' column — for each printed row, top to
   * bottom, its place in the proof. The printed order itself is not a valid proof.
   */
  acceptedOrders?: number[][];
  expected: {
    choice?: string;
    conclusion?: string;
    proof?: string[];
    reason?: string | string[];
    requiredDatum?: string;
    unneededDatum?: string;
  };
  /** A note printed for the teacher beside the key (e.g. another correct route). */
  teacherNote?: string;
};

export const unit3Questions: Unit3Question[] = [
  // עמוד 1 — זיהוי ובחירת נימוק
  {
    id: 'U3-P1-A',
    page: 1,
    // The stem does not name the pair: the student reads from the drawing that ∠A, ∠B are
    // corresponding, and must prefer the reason that carries the parallel condition.
    stem: 'בשרטוט p ∥ q. בחרו את הנימוק המתאים לטענה ∠A = ∠B.',
    choices: [
      ALTERNATE,
      CORRESPONDING,
      'זוויות מתאימות שוות.',
      VERTICAL
    ],
    diagram: {
      topology: 'proof-reason-corresponding-basic',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B'],
      orientationDeg: 0,
      transversalDeg: 117,
      parallelGivens: ['p ∥ q'],
      target: '∠A = ∠B'
    },
    expected: { choice: CORRESPONDING },
    teacherNote: 'הזוויות ∠A ו־∠B הן זוויות מתאימות, והישרים p ו־q מקבילים. הנימוק „זוויות מתאימות שוות.” חסר את תנאי המקבילות ולכן אינו נכון.'
  },
  {
    id: 'U3-P1-B',
    page: 1,
    stem: 'השלימו את הנימוק החסר בהוכחה.',
    proofLines: [
      { claim: 'p ∥ q', reason: GIVEN },
      { claim: '∠C = ∠D', reason: '__________' }
    ],
    diagram: {
      topology: 'fill-reason-corresponding',
      lineLabels: ['p', 'q', 'r'],
      pointLabels: ['C', 'D'],
      orientationDeg: 5,
      transversalDeg: 58,
      parallelGivens: ['p ∥ q'],
      target: 'complete reason for ∠C = ∠D'
    },
    expected: { reason: CORRESPONDING }
  },
  {
    id: 'U3-P1-C',
    page: 1,
    // Four reasons for three claims, so the last match never follows by elimination.
    stem: 'בשרטוט k ∥ m. לכל טענה רשמו את הנימוק המתאים לה מן הרשימה. נימוק אחד ברשימה מיותר.',
    subparts: [
      '∠A = ∠B',
      '∠C = ∠D',
      '∠E = ∠F'
    ],
    choices: [
      ALTERNATE,
      ADJACENT,
      CORRESPONDING,
      VERTICAL
    ],
    diagram: {
      topology: 'claim-reason-matching-three-relations',
      // Six distinct angles cannot carry a corresponding, an alternate and a vertical pair on
      // one transversal (8 angles, but any vertical pair blocks the other two), so the
      // vertical pair ∠E, ∠F sits on a second transversal t.
      lineLabels: ['k', 'm', 's', 't'],
      pointLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
      orientationDeg: -8,
      transversalDeg: 116,
      secondaryTransversalDeg: 102,
      parallelGivens: ['k ∥ m'],
      target: 'match each equality to its reason'
    },
    expected: {
      proof: [
        `∠A = ∠B — ${CORRESPONDING}`,
        `∠C = ∠D — ${ALTERNATE}`,
        `∠E = ∠F — ${VERTICAL}`
      ]
    },
    teacherNote: `הנימוק „${ADJACENT}” אינו מתאים לאף טענה.`
  },
  {
    id: 'U3-P1-D',
    page: 1,
    stem: 'בשרטוט a ∥ b. קבעו אם ∠A = ∠C. נמקו את קביעתכם.',
    diagram: {
      topology: 'short-deduction-corresponding-vertical-rotated',
      lineLabels: ['a', 'b', 'u'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 79,
      transversalDeg: 26,
      parallelGivens: ['a ∥ b'],
      givens: ['∠A corresponds to ∠B', '∠B vertical to ∠C', '∠A and ∠C are alternate (one-step route)'],
      target: '∠A = ∠C'
    },
    expected: {
      conclusion: 'כן, ∠A = ∠C.',
      proof: [
        `∠A = ∠B — ${CORRESPONDING}`,
        `∠B = ∠C — ${VERTICAL}`,
        `∠A = ∠C — ${TRANSITIVITY}`
      ]
    },
    teacherNote: `גם נימוק בשלב אחד נכון, כי ∠A ו־∠C הן זוויות מתחלפות: ∠A = ∠C — ${ALTERNATE} שתי הדרכים מתקבלות.`
  },

  // עמוד 2 — מבנה הוכחה, איתור שגיאה והשלמת חסרים
  {
    id: 'U3-P2-A',
    page: 2,
    // The stem does not reveal the error: the student classifies the pair from the drawing.
    stem: 'בשרטוט p ∥ q. תלמיד כתב: „∠A = ∠B כי הן זוויות מתאימות בין ישרים מקבילים”. מצאו את הטעות בנימוק ותקנו אותו.',
    diagram: {
      topology: 'proof-error-alternate-mislabeled-corresponding',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B'],
      orientationDeg: 14,
      transversalDeg: 118,
      parallelGivens: ['p ∥ q'],
      target: 'correct justification for ∠A = ∠B'
    },
    expected: {
      reason: [
        'הטעות בסוג הזוג: התלמיד כתב „מתאימות”, אבל ∠A ו־∠B הן זוויות מתחלפות.',
        `נימוק מתוקן: ∠A = ∠B כי ${ALTERNATE}`
      ]
    }
  },
  {
    id: 'U3-P2-B',
    page: 2,
    // Printed in an order that is NOT a valid proof: the conclusion first, and the corresponding
    // step before the given it depends on.
    stem: 'שורות ההוכחה שבטבלה מופיעות בסדר שגוי. רשמו בעמודה „סדר” את מקומה של כל שורה בהוכחה.',
    proofLines: [
      { claim: '∠A = ∠C', reason: TRANSITIVITY },
      { claim: '∠A = ∠B', reason: CORRESPONDING },
      { claim: '∠B = ∠C', reason: VERTICAL },
      { claim: 'p ∥ q', reason: GIVEN }
    ],
    acceptedOrders: [
      [4, 2, 3, 1],
      [4, 3, 2, 1],
      [4, 3, 1, 2]
    ],
    diagram: {
      topology: 'order-four-proof-lines',
      lineLabels: ['p', 'q', 'r'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: -5,
      transversalDeg: 123,
      parallelGivens: ['p ∥ q'],
      target: 'prove ∠A = ∠C'
    },
    expected: {
      proof: [
        `p ∥ q — ${GIVEN}`,
        `∠A = ∠B — ${CORRESPONDING}`,
        `∠B = ∠C — ${VERTICAL}`,
        `∠A = ∠C — ${TRANSITIVITY}`
      ],
      reason: [
        'השורה p ∥ q חייבת להופיע לפני השורה ∠A = ∠B, והשורה ∠A = ∠C היא האחרונה. השורה ∠B = ∠C יכולה להופיע בכל מקום לפני האחרונה.',
        'בעמודה „סדר”, מלמעלה למטה, מתקבלים שלושה מילויים: 4, 2, 3, 1 או 4, 3, 2, 1 או 4, 3, 1, 2.'
      ]
    }
  },
  {
    id: 'U3-P2-C',
    page: 2,
    stem: 'השלימו את השורה החסרה בהוכחה.',
    proofLines: [
      { claim: 'k ∥ m', reason: GIVEN },
      { claim: '__________', reason: ALTERNATE },
      { claim: '∠B = ∠C', reason: VERTICAL },
      { claim: '∠A = ∠C', reason: TRANSITIVITY }
    ],
    diagram: {
      topology: 'fill-proof-claim-alternate-then-vertical',
      lineLabels: ['k', 'm', 's'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 81,
      transversalDeg: 157,
      parallelGivens: ['k ∥ m'],
      target: 'complete ∠A = ∠B'
    },
    expected: { reason: 'השורה החסרה: ∠A = ∠B.' }
  },
  {
    id: 'U3-P2-D',
    page: 2,
    // Every option is a datum about objects in the drawing; only p ∥ q makes ∠A = ∠B follow.
    // r and s are drawn parallel-looking (no marks), exactly like p and q.
    stem: 'המטרה היא להוכיח כי ∠A = ∠B. איזה מן הנתונים שלהלן מספיק לבדו כדי להוכיח זאת? נמקו.',
    choices: [
      'r ∥ s',
      'p ∥ q',
      'שתי הזוויות המסומנות הן זוויות מתאימות',
      'הישר s חותך את הישרים p ו־q'
    ],
    diagram: {
      topology: 'proof-data-selection-four-lines',
      lineLabels: ['p', 'q', 'r', 's'],
      pointLabels: ['A', 'B'],
      orientationDeg: 19,
      transversalDeg: 83,
      secondaryTransversalDeg: 83,
      parallelGivens: [],
      givens: ['∠A and ∠B occupy corresponding positions relative to p, q and transversal r'],
      target: 'select sufficient given to prove ∠A = ∠B'
    },
    expected: {
      choice: 'p ∥ q',
      requiredDatum: 'p ∥ q',
      reason: [
        `הנתון p ∥ q מספיק: ∠A ו־∠B הן זוויות מתאימות ביחס לישרים p ו־q והחותך r, ולפי המשפט „${CORRESPONDING}” הן שוות.`,
        'הנתון r ∥ s אינו עוזר: הזוויות נוצרות בחיתוך הישר r עם p ועם q, ולכן נדרשת מקבילות של p ו־q.',
        'עצם היותן של הזוויות מתאימות אינו מבטיח שוויון בלי נתון המקבילות, והעובדה שהישר s חותך את p ואת q אינה קשורה לזוויות ∠A ו־∠B.'
      ]
    }
  },

  // עמוד 3 — הוכחות קצרות מלאות והערכת הוכחה
  {
    id: 'U3-P3-A',
    page: 3,
    stem: 'נתון p ∥ q. הוכיחו כי ∠A = ∠C.',
    diagram: {
      topology: 'full-proof-corresponding-then-vertical',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: -16,
      transversalDeg: 59,
      parallelGivens: ['p ∥ q'],
      givens: ['∠A corresponds to ∠B', '∠B vertical to ∠C', '∠A and ∠C are alternate (one-step route)'],
      target: '∠A = ∠C'
    },
    expected: {
      proof: [
        `∠A = ∠B — ${CORRESPONDING}`,
        `∠B = ∠C — ${VERTICAL}`,
        `∠A = ∠C — ${TRANSITIVITY}`
      ]
    },
    teacherNote: `גם הוכחה בשלב אחד נכונה, כי ∠A ו־∠C הן זוויות מתחלפות: ∠A = ∠C — ${ALTERNATE} שתי הדרכים מתקבלות.`
  },
  {
    id: 'U3-P3-B',
    page: 3,
    stem: 'נתון k ∥ m. הוכיחו כי ∠A + ∠C = 180°.',
    diagram: {
      topology: 'full-proof-alternate-then-adjacent-supplementary',
      lineLabels: ['k', 'm', 'r'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 68,
      transversalDeg: 15,
      parallelGivens: ['k ∥ m'],
      givens: ['∠A alternates with ∠B', '∠B adjacent to ∠C'],
      target: '∠A + ∠C = 180°'
    },
    expected: {
      proof: [
        `∠A = ∠B — ${ALTERNATE}`,
        `∠B + ∠C = 180° — ${ADJACENT}`,
        'לכן ∠A + ∠C = 180°.'
      ]
    }
  },
  {
    id: 'U3-P3-C',
    page: 3,
    stem: 'נתון a ∥ b וכן ∠E = 35°. הוכיחו כי ∠A = ∠D. קבעו אם הנתון ∠E = 35° נחוץ להוכחה, ונמקו.',
    diagram: {
      topology: 'proof-extra-data-two-transversals',
      lineLabels: ['a', 'b', 'r', 's'],
      pointLabels: ['A', 'B', 'D', 'E'],
      orientationDeg: 11,
      transversalDeg: 114,
      secondaryTransversalDeg: 129,
      parallelGivens: ['a ∥ b'],
      givens: ['∠A corresponds to ∠B on transversal r', '∠B vertical to ∠D', '∠A and ∠D are alternate (one-step route)', '∠E = 35° on transversal s'],
      target: '∠A = ∠D'
    },
    expected: {
      proof: [
        `∠A = ∠B — ${CORRESPONDING}`,
        `∠B = ∠D — ${VERTICAL}`,
        `∠A = ∠D — ${TRANSITIVITY}`
      ],
      unneededDatum: '∠E = 35°',
      reason: 'הנתון ∠E = 35° אינו נחוץ להוכחה: ∠E נמצאת על הישר s, וההוכחה משתמשת רק בנתון a ∥ b ובזוויות שעל הישר r.'
    },
    teacherNote: `גם הוכחה בשלב אחד נכונה, כי ∠A ו־∠D הן זוויות מתחלפות: ∠A = ∠D — ${ALTERNATE} שתי הדרכים מתקבלות, ובשתיהן הנתון ∠E = 35° אינו נחוץ.`
  },
  {
    id: 'U3-P3-D',
    page: 3,
    stem: 'נתון p ∥ q. שני תלמידים כתבו הוכחה לטענה ∠A = ∠C. קבעו איזו הוכחה נכונה ונמקו.',
    subparts: [
      'הוכחה א: ∠A = ∠B כי הן זוויות מתאימות בין הישרים המקבילים p ו־q; ∠B = ∠C כי הן זוויות קודקודיות; לכן ∠A = ∠C.',
      'הוכחה ב: ∠A = ∠C כי שתיהן זוויות מתחלפות, ולכן הן שוות.'
    ],
    diagram: {
      topology: 'compare-two-proofs-same-target',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: -9,
      transversalDeg: 44,
      parallelGivens: ['p ∥ q'],
      givens: ['∠A corresponds to ∠B', '∠B vertical to ∠C', '∠A and ∠C are alternate angles; proof B never uses p ∥ q'],
      target: 'evaluate two proofs of ∠A = ∠C'
    },
    expected: {
      choice: 'הוכחה א',
      reason: [
        'הוכחה א נכונה: ∠A = ∠B כי הן זוויות מתאימות בין הישרים המקבילים p ו־q, ו־∠B = ∠C כי הן זוויות קודקודיות.',
        `הוכחה ב אינה נכונה כפי שנכתבה. הזוויות ∠A ו־∠C אכן מתחלפות, אבל עצם היותן מתחלפות אינו מבטיח שהן שוות: המשפט הוא „${ALTERNATE}”, ובהוכחה ב לא נעשה שימוש בנתון שהישרים p ו־q מקבילים.`,
        'תיקון להוכחה ב: ∠A = ∠C כי הן זוויות מתחלפות בין הישרים המקבילים p ו־q.'
      ]
    }
  }
];
