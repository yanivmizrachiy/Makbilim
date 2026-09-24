import { REASONS, THEOREMS } from './theorems';

/** Every reason in a key is the canonical sentence itself (SPEC 3.1), never a retyped variant. */
const CORRESPONDING = THEOREMS.correspondingDirect.text;
const ALTERNATE = THEOREMS.alternateDirect.text;
const ADJACENT = REASONS.adjacent;
const VERTICAL = REASONS.vertical;
const COINTERIOR = THEOREMS.coInteriorDirect.text;

export type Unit2Question = {
  id: string;
  page: number;
  stem: string;
  subparts?: string[];
  choices?: string[];
  tableRows?: Array<{ label: string; relation?: string; value?: string }>;
  diagram: {
    topology: string;
    lineLabels: string[];
    pointLabels?: string[];
    orientationDeg: number;
    transversalDeg?: number;
    secondaryTransversalDeg?: number;
    parallelGiven: boolean;
    givens: string[];
    targets: string[];
  };
  justificationLane?: boolean;
  expected: {
    values?: Record<string, string | number>;
    choice?: string;
    unneededDatum?: string;
    /** One line per table row, in row order (a table the student fills from the drawing). */
    completions?: string[];
    justification?: string | string[];
  };
  /** A note for the teacher: other correct routes, what the error is. */
  note?: string;
};

export const unit2Questions: Unit2Question[] = [
  // עמוד 1 — חישוב ישיר במספרים
  {
    id: 'U2-P1-A',
    page: 1,
    stem: 'בשרטוט שלפניכם הישרים p ו־q מקבילים. נתון כי ∠A = 68°. חשבו את גודלה של ∠B.',
    diagram: {
      topology: 'parallel-lines-one-transversal-corresponding',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B'],
      orientationDeg: 0,
      transversalDeg: 112,
      parallelGiven: true,
      givens: ['∠A = 68°'],
      targets: ['∠B corresponding to ∠A']
    },
    expected: { values: { '∠B': 68 }, justification: CORRESPONDING }
  },
  {
    id: 'U2-P1-B',
    page: 1,
    stem: 'הישרים k ו־m מקבילים. נתון כי ∠C = 124°. חשבו את גודלה של ∠D.',
    diagram: {
      topology: 'parallel-lines-one-transversal-alternate',
      lineLabels: ['k', 'm', 'r'],
      pointLabels: ['C', 'D'],
      orientationDeg: 7,
      transversalDeg: 63,
      parallelGiven: true,
      givens: ['∠C = 124°'],
      targets: ['∠D alternate to ∠C']
    },
    expected: { values: { '∠D': 124 }, justification: ALTERNATE }
  },
  {
    id: 'U2-P1-C',
    page: 1,
    stem: 'בשרטוט הישרים a ו־b מקבילים. נתון כי הזווית המסומנת היא 47°. בחרו את גודלה של הזווית המתאימה לה.',
    // 'אי אפשר לקבוע' is the error of ignoring the given a ∥ b; 43° confuses with 90°; 133° with adjacent.
    choices: ['47°', '43°', 'אי אפשר לקבוע מהנתונים', '133°'],
    diagram: {
      topology: 'parallel-lines-one-transversal-corresponding-choice',
      lineLabels: ['a', 'b', 's'],
      orientationDeg: -9,
      transversalDeg: 124,
      parallelGiven: true,
      givens: ['given angle = 47°'],
      targets: ['corresponding target angle']
    },
    expected: { choice: '47°', justification: CORRESPONDING }
  },
  {
    id: 'U2-P1-D',
    page: 1,
    stem: 'הישרים r ו־s מקבילים. נתון כי ∠E = 116°. חשבו את α ונמקו.',
    diagram: {
      topology: 'parallel-lines-one-transversal-alternate-alpha',
      lineLabels: ['r', 's', 'u'],
      pointLabels: ['E'],
      orientationDeg: 13,
      transversalDeg: 77,
      parallelGiven: true,
      givens: ['∠E = 116°'],
      targets: ['α alternate to ∠E']
    },
    expected: { values: { 'α': 116 }, justification: ALTERNATE }
  },

  // עמוד 2 — חישוב דו־שלבי
  {
    id: 'U2-P2-A',
    page: 2,
    stem: 'בשרטוט p ∥ q (הישרים p ו־q מקבילים). נתון ∠A = 63°. חשבו את β.',
    diagram: {
      topology: 'corresponding-then-adjacent',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A'],
      orientationDeg: 3,
      transversalDeg: 120,
      parallelGiven: true,
      givens: ['∠A = 63°'],
      targets: ['β adjacent to the angle corresponding to ∠A']
    },
    expected: {
      values: { 'β': 117 },
      justification: [CORRESPONDING, ADJACENT]
    },
    note: `גם הסדר ההפוך נכון: הזווית הצמודה ל־∠A היא 117°, ו־β מתחלפת לה. נכונה גם דרך בשלב אחד: ∠A ו־β הן זוויות חד-צדדיות, ולכן β = 180° − 63° = 117° — ${COINTERIOR} תשובה של 63° מעתיקה את ∠A בלי לזהות ש־β צמודה לזווית המתאימה ל־∠A.`
  },
  {
    id: 'U2-P2-B',
    page: 2,
    stem: 'הישרים m ו־n מקבילים. נתון כי הזווית המסומנת היא 137°. חשבו את γ.',
    diagram: {
      topology: 'straight-angle-then-alternate',
      lineLabels: ['m', 'n', 'v'],
      orientationDeg: -5,
      transversalDeg: 38,
      parallelGiven: true,
      givens: ['given angle = 137°'],
      targets: ['γ alternate to the adjacent supplementary angle']
    },
    expected: {
      values: { 'γ': 43 },
      justification: [ADJACENT, ALTERNATE]
    },
    note: `נכונה גם דרך בשלב אחד: הזווית של 137° ו־γ הן זוויות חד-צדדיות, ולכן γ = 180° − 137° = 43° — ${COINTERIOR}`
  },
  {
    id: 'U2-P2-C',
    page: 2,
    stem: 'בשרטוט הישרים c ו־d מקבילים. נתון כי ∠F = 72°. מצאו את δ.',
    diagram: {
      topology: 'alternate-then-adjacent-rotated',
      lineLabels: ['c', 'd', 'w'],
      pointLabels: ['F'],
      orientationDeg: 77,
      transversalDeg: 149,
      parallelGiven: true,
      givens: ['∠F = 72°'],
      targets: ['δ adjacent to the angle alternate to ∠F']
    },
    expected: {
      values: { 'δ': 108 },
      justification: [ALTERNATE, ADJACENT]
    }
  },
  {
    id: 'U2-P2-D',
    page: 2,
    stem: 'נתון p ∥ q ו־∠A = 54°. חשבו את α בשתי דרכים שונות. בכל דרך ציינו את קשרי הזוויות שבהם השתמשתם.',
    diagram: {
      topology: 'two-valid-routes-corresponding-vertical',
      lineLabels: ['p', 'q', 'r'],
      pointLabels: ['A'],
      orientationDeg: -14,
      transversalDeg: 112,
      parallelGiven: true,
      givens: ['∠A = 54°'],
      targets: ['α alternate to ∠A; also reachable by corresponding→vertical or vertical→corresponding']
    },
    expected: {
      values: { 'α': 54 },
      justification: [
        `דרך אפשרית: ${ALTERNATE}`,
        `דרך אפשרית: ${CORRESPONDING} ${VERTICAL}`,
        `דרך אפשרית: ${VERTICAL} ${CORRESPONDING}`
      ]
    },
    note: 'α ו־∠A מתחלפות, ולכן גם דרך בשלב אחד נכונה. מתקבלת גם דרך דרך הזווית החד-צדדית ל־∠A (126°) ו־α הצמודה לה. כל שתי דרכים שונות ונכונות מתקבלות; אותו רצף קשרים שנכתב פעמיים אינו שתי דרכים.'
  },

  // עמוד 3 — טבלאות, בחירת נתונים ושני חותכים
  {
    id: 'U2-P3-A',
    page: 3,
    stem: 'בשרטוט p ∥ q ונתונה זווית שגודלה 38°. לכל זווית המסומנת באות, השלימו בטבלה את סוג הקשר שלה לזווית הנתונה ואת גודלה.',
    tableRows: [
      { label: 'א', relation: '', value: '' },
      { label: 'ב', relation: '', value: '' },
      { label: 'ג', relation: '', value: '' },
      { label: 'ד', relation: '', value: '' }
    ],
    diagram: {
      topology: 'eight-angles-table',
      lineLabels: ['p', 'q', 't'],
      orientationDeg: 10,
      transversalDeg: 152,
      parallelGiven: true,
      givens: ['reference angle = 38°'],
      targets: ['corresponding', 'alternate', 'vertical', 'adjacent']
    },
    expected: {
      completions: ['א: קודקודית, 38°', 'ב: מתאימה, 38°', 'ג: צמודה, 142°', 'ד: מתחלפת, 38°']
    }
  },
  {
    id: 'U2-P3-B',
    page: 3,
    stem: 'בשרטוט הישרים k ו־m מקבילים. נתון כי ∠A = 52°. היעזרו בשרטוט ובטבלה, ומצאו את גודלן של ∠D ושל ∠F.',
    tableRows: [
      { label: '∠A', relation: 'נתונה', value: '52°' },
      { label: '∠D', relation: 'מתאימה ל־∠A', value: '' },
      { label: '∠F', relation: 'צמודה ל־∠D', value: '' }
    ],
    diagram: {
      topology: 'rotated-table-cross-representation',
      lineLabels: ['k', 'm', 's'],
      pointLabels: ['A', 'D', 'F'],
      orientationDeg: 84,
      transversalDeg: 136,
      parallelGiven: true,
      givens: ['∠A = 52°'],
      targets: ['∠D corresponding to ∠A', '∠F adjacent to ∠D']
    },
    expected: { values: { '∠D': 52, '∠F': 128 } }
  },
  {
    id: 'U2-P3-C',
    page: 3,
    stem: 'בשרטוט p ∥ q. נתון ∠A = 62° וכן ∠C = 77°. חשבו את β וקבעו איזה מן הנתונים אינו נחוץ לחישוב.',
    diagram: {
      topology: 'two-transversals-one-redundant-datum',
      lineLabels: ['p', 'q', 't', 's'],
      pointLabels: ['A', 'C'],
      orientationDeg: 10,
      transversalDeg: 128,
      secondaryTransversalDeg: 113,
      parallelGiven: true,
      givens: ['∠A = 62° on transversal t', '∠C = 77° on transversal s'],
      targets: ['β corresponding to ∠A on transversal t']
    },
    expected: { values: { 'β': 62 }, unneededDatum: '∠C = 77°' }
  },
  {
    id: 'U2-P3-D',
    page: 3,
    stem: 'הישרים a ו־b מקבילים ונחתכים על ידי שני ישרים שונים. נתון כי ∠A = 49° ו־∠C = 73°. חשבו את α ואת β.',
    diagram: {
      topology: 'parallel-lines-two-transversals-two-targets',
      lineLabels: ['a', 'b', 'r', 's'],
      pointLabels: ['A', 'C'],
      orientationDeg: -11,
      transversalDeg: 38,
      secondaryTransversalDeg: 96,
      parallelGiven: true,
      givens: ['∠A = 49° on transversal r', '∠C = 73° on transversal s'],
      targets: ['α corresponding to ∠A', 'β alternate to ∠C']
    },
    expected: {
      values: { 'α': 49, 'β': 73 },
      justification: [CORRESPONDING, ALTERNATE]
    }
  },

  // עמוד 4 — כניסה לאלגברה
  {
    id: 'U2-P4-A',
    page: 4,
    stem: 'בשרטוט p ∥ q. גודלי שתי הזוויות המסומנות הם (4x + 6)° ו־(2x + 38)°. זהו את סוג הזוויות, כתבו את המשפט המתאים, מצאו את x וחשבו את גודל הזוויות.',
    diagram: {
      topology: 'corresponding-two-expressions-simple',
      lineLabels: ['p', 'q', 't'],
      orientationDeg: 4,
      transversalDeg: 114,
      parallelGiven: true,
      givens: ['(4x + 6)°', '(2x + 38)°'],
      targets: ['x', 'marked angle']
    },
    justificationLane: true,
    expected: { values: { x: 16, 'זווית': 70 }, justification: CORRESPONDING }
  },
  {
    id: 'U2-P4-B',
    page: 4,
    stem: 'הישרים k ו־m מקבילים. שתי הזוויות המסומנות הן (3x + 17)° ו־(5x − 21)°. איזה סוג זוויות הן? כתבו את המשפט המתאים, מצאו את x ואת גודל הזוויות.',
    diagram: {
      topology: 'alternate-two-expressions-simple',
      lineLabels: ['k', 'm', 'r'],
      orientationDeg: -8,
      transversalDeg: 66,
      parallelGiven: true,
      givens: ['(3x + 17)°', '(5x − 21)°'],
      targets: ['x', 'marked angle']
    },
    justificationLane: true,
    expected: { values: { x: 19, 'זווית': 74 }, justification: ALTERNATE }
  },
  {
    id: 'U2-P4-C',
    page: 4,
    stem: 'בשרטוט a ∥ b. הזוויות המסומנות הן (6x − 9)° ו־(3x + 42)°. זהו את סוג הזוויות ורשמו את המשפט המתאים. מצאו את x ולאחר מכן חשבו את גודלן של הזוויות המסומנות.',
    diagram: {
      topology: 'corresponding-expressions-solve-x-then-angle',
      lineLabels: ['a', 'b', 's'],
      orientationDeg: 38,
      transversalDeg: 131,
      parallelGiven: true,
      givens: ['(6x − 9)°', '(3x + 42)°'],
      targets: ['x', 'marked angle']
    },
    justificationLane: true,
    expected: { values: { x: 17, 'זווית': 93 }, justification: CORRESPONDING }
  },
  {
    id: 'U2-P4-D',
    page: 4,
    stem: 'בשרטוט הישרים r ו־s מקבילים. גודלי שתי הזוויות המסומנות הם (2x + 35)° ו־(5x − 19)°. זהו את סוג הזוויות, בחרו את המשוואה המתאימה, נמקו ופתרו, וחשבו את גודל הזוויות.',
    choices: [
      '2x + 35 = 5x − 19',
      '(2x + 35) + (5x − 19) = 180',
      '(2x + 35) + (5x − 19) = 90',
      '2x + 35 = 5x + 19'
    ],
    diagram: {
      topology: 'alternate-equation-choice',
      lineLabels: ['r', 's', 'u'],
      orientationDeg: 15,
      transversalDeg: 86,
      parallelGiven: true,
      givens: ['(2x + 35)°', '(5x − 19)°'],
      targets: ['correct equation', 'x', 'marked angle']
    },
    justificationLane: true,
    expected: { choice: '2x + 35 = 5x − 19', values: { x: 18, 'זווית': 71 }, justification: ALTERNATE }
  },

  // עמוד 5 — אלגברה מתקדמת יותר
  {
    id: 'U2-P5-A',
    page: 5,
    stem: 'בשרטוט p ∥ q. גודלי שתי הזוויות המסומנות הם (7x − 18)° ו־(3x + 38)°. מצאו את x ואת גודלה של כל אחת מהזוויות. נמקו כל שלב.',
    diagram: {
      topology: 'corresponding-plus-adjacent-two-expressions',
      lineLabels: ['p', 'q', 'v'],
      orientationDeg: -15,
      transversalDeg: 71,
      parallelGiven: true,
      givens: ['(7x − 18)° at p', '(3x + 38)° at q, adjacent to the angle corresponding to (7x − 18)°'],
      targets: ['x', 'both angles']
    },
    justificationLane: true,
    expected: {
      values: { x: 16, '7x − 18': 94, '3x + 38': 86 },
      justification: [CORRESPONDING, ADJACENT]
    },
    note: 'המשוואה: (7x − 18) + (3x + 38) = 180. השוואת שני הביטויים זה לזה נותנת x = 14 ושתי זוויות של 80° — אבל הזוויות המסומנות אינן מתאימות: הזווית ב־q צמודה לזווית המתאימה לזווית שב־p.'
  },
  {
    id: 'U2-P5-B',
    page: 5,
    stem: 'הישרים c ו־d מקבילים. גודלי שתי הזוויות המסומנות הם (4x + 15)° ו־(2x + 63)°. זהו את סוג הזוויות, כתבו את המשפט, מצאו את x ואת גודל הזוויות.',
    diagram: {
      topology: 'alternate-two-expressions-advanced',
      lineLabels: ['c', 'd', 'w'],
      orientationDeg: 46,
      transversalDeg: 157,
      parallelGiven: true,
      givens: ['(4x + 15)°', '(2x + 63)°'],
      targets: ['x', 'angle value']
    },
    justificationLane: true,
    expected: { values: { x: 24, 'זווית': 111 }, justification: ALTERNATE }
  },
  {
    id: 'U2-P5-C',
    page: 5,
    stem: 'בשרטוט p ∥ q ושני ישרים חותכים אותם. בזוג זוויות אחד הגדלים הם (3x + 12)° ו־72°, ובזוג השני (2y + 18)° ו־94°. זהו את סוג כל זוג, כתבו את המשפטים המתאימים ומצאו את x ואת y.',
    diagram: {
      topology: 'two-transversals-two-independent-equations',
      lineLabels: ['p', 'q', 'r', 's'],
      orientationDeg: 9,
      transversalDeg: 117,
      secondaryTransversalDeg: 103,
      parallelGiven: true,
      givens: ['(3x + 12)° corresponds to 72°', '(2y + 18)° alternates with 94°'],
      targets: ['x', 'y']
    },
    justificationLane: true,
    expected: {
      values: { x: 20, y: 38 },
      justification: [CORRESPONDING, ALTERNATE]
    }
  },
  {
    id: 'U2-P5-D',
    page: 5,
    stem: 'הישרים a ו־b מקבילים. דני כתב את המשוואה 2x + 20 = 3x + 35 והסביר: „הישרים מקבילים, ולכן שתי הזוויות המסומנות שוות.” קבעו אם המשוואה וההסבר נכונים. אם לא, כתבו משוואה נכונה, נמקו, מצאו את x וחשבו את גודל שתי הזוויות.',
    diagram: {
      topology: 'adjacent-angles-error-analysis-with-parallel-context',
      lineLabels: ['a', 'b', 't'],
      orientationDeg: -4,
      transversalDeg: 106,
      parallelGiven: true,
      givens: ['a ∥ b', 'marked angles (2x + 20)° and (3x + 35)° at the same intersection (adjacency is not stated in words)'],
      targets: ['correct equation', 'x']
    },
    justificationLane: true,
    expected: {
      values: { x: 25, '2x + 20': 70, '3x + 35': 110 },
      justification: `${ADJACENT} המשוואה הנכונה: (2x + 20) + (3x + 35) = 180.`
    },
    note: 'המשוואה וההסבר שגויים: שתי הזוויות המסומנות נמצאות באותה נקודת חיתוך — הן צמודות, לא מתאימות ולא מתחלפות, ולכן המקבילות אינה נותנת כאן שוויון. המשוואה של דני נותנת x = −15, כלומר זוויות של −10°.'
  },

  // עמוד 6 — העברה ויישום עצמאי
  {
    id: 'U2-P6-A',
    page: 6,
    stem: 'שני מדפים מקבילים זה לזה, ומוט ישר חותך את שניהם באלכסון. הזווית שבין המוט למדף העליון היא 64°. חשבו את גודל הזווית המסומנת ב־? ונמקו.',
    diagram: {
      topology: 'shelves-parallel-diagonal-support',
      lineLabels: ['מדף עליון', 'מדף תחתון', 'מוט'],
      orientationDeg: 2,
      transversalDeg: 66,
      parallelGiven: true,
      givens: ['upper angle = 64°'],
      targets: ['the angle marked ? at the lower shelf (corresponding to the given one)']
    },
    expected: { values: { 'זווית': 64 }, justification: CORRESPONDING }
  },
  {
    id: 'U2-P6-B',
    page: 6,
    stem: 'שתי מסילות ישרות מקבילות נחתכות על ידי קו ישר אלכסוני. אחת הזוויות המסומנות היא 118°. חשבו את גודל הזווית המסומנת ב־? ונמקו.',
    diagram: {
      topology: 'parallel-rails-alternate-then-adjacent',
      lineLabels: ['מסילה 1', 'מסילה 2', 'חותך'],
      orientationDeg: -18,
      transversalDeg: 100,
      parallelGiven: true,
      givens: ['given angle = 118°'],
      targets: ['the angle marked ? on the second rail, adjacent to the angle alternate to 118°']
    },
    expected: { values: { 'זווית': 62 }, justification: [ALTERNATE, ADJACENT] },
    note: 'גם הדרך דרך הזווית המתאימה ל־118° במסילה השנייה, ולאחריה הזווית הצמודה לה, נכונה. תשובה של 118° מעתיקה את הזווית הנתונה בלי השלב של הזווית הצמודה. נכונה גם דרך בשלב אחד: הזווית של 118° והזווית המסומנת ב־? הן זוויות חד-צדדיות בין המסילות, ולכן ? = 180° − 118° = 62°.'
  },
  {
    id: 'U2-P6-C',
    page: 6,
    stem: 'בשרטוט p ∥ q ושני ישרים חותכים אותם. נתון כי ∠A = 128° וכן ∠C = 75°. חשבו את α ונמקו. ציינו איזה מן הנתונים אינו נחוץ לפתרון.',
    diagram: {
      topology: 'mixed-two-transversals-extra-data',
      lineLabels: ['p', 'q', 'r', 's'],
      pointLabels: ['A', 'C'],
      orientationDeg: 18,
      // 258° / 273° are the same lines as 78° / 93°; the upper end carries the line label,
      // away from where the two transversals meet below q.
      transversalDeg: 146,
      secondaryTransversalDeg: 273,
      parallelGiven: true,
      givens: ['∠A = 128° on transversal r', '∠C = 75° on transversal s'],
      targets: ['α adjacent to the corresponding angle of ∠A']
    },
    expected: {
      values: { 'α': 52 },
      unneededDatum: '∠C = 75°',
      justification: [CORRESPONDING, ADJACENT]
    }
  },
  {
    id: 'U2-P6-D',
    page: 6,
    stem: 'הישרים k ו־m מקבילים ונחתכים על ידי שני ישרים. נתון כי ∠A = 41° ו־∠C = 68°. חשבו את α + β. נמקו כל שלב בחישוב.',
    diagram: {
      topology: 'two-transversals-final-mixed-synthesis',
      lineLabels: ['k', 'm', 'r', 's'],
      pointLabels: ['A', 'C'],
      orientationDeg: 74,
      // 202° / 189° (the lines through 22° / 9°): each line label sits at the end where the
      // two transversals spread apart.
      transversalDeg: 213,
      secondaryTransversalDeg: 186,
      parallelGiven: true,
      givens: ['∠A = 41°', '∠C = 68°'],
      targets: ['α corresponding to ∠A', 'β adjacent to angle corresponding to ∠C', 'α + β']
    },
    justificationLane: true,
    expected: {
      values: { 'α': 41, 'β': 112, 'α + β': 153 },
      justification: [CORRESPONDING, ADJACENT]
    }
  }
];
