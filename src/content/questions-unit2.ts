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
    justification?: string | string[];
  };
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
      transversalDeg: 57,
      parallelGiven: true,
      givens: ['∠A = 68°'],
      targets: ['∠B corresponding to ∠A']
    },
    expected: { values: { '∠B': 68 }, justification: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
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
      transversalDeg: 116,
      parallelGiven: true,
      givens: ['∠C = 124°'],
      targets: ['∠D alternate to ∠C']
    },
    expected: { values: { '∠D': 124 }, justification: 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U2-P1-C',
    page: 1,
    stem: 'בשרטוט הישרים a ו־b מקבילים. נתון כי הזווית המסומנת היא 47°. בחרו את גודלה של הזווית המתאימה לה.',
    choices: ['47°', '43°', '90°', '133°'],
    diagram: {
      topology: 'parallel-lines-one-transversal-corresponding-choice',
      lineLabels: ['a', 'b', 's'],
      orientationDeg: -9,
      transversalDeg: 62,
      parallelGiven: true,
      givens: ['given angle = 47°'],
      targets: ['corresponding target angle']
    },
    expected: { choice: '47°', justification: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
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
      transversalDeg: 69,
      parallelGiven: true,
      givens: ['∠E = 116°'],
      targets: ['α alternate to ∠E']
    },
    expected: { values: { 'α': 116 }, justification: 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' }
  },

  // עמוד 2 — חישוב דו־שלבי
  {
    id: 'U2-P2-A',
    page: 2,
    stem: 'בשרטוט p ∥ q ונתון ∠A = 63°. חשבו את β.',
    diagram: {
      topology: 'corresponding-then-vertical',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A'],
      orientationDeg: 3,
      transversalDeg: 52,
      parallelGiven: true,
      givens: ['∠A = 63°'],
      targets: ['β vertical to the corresponding angle at second intersection']
    },
    expected: {
      values: { 'β': 63 },
      justification: ['זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'זוויות קודקודיות שוות זו לזו.']
    }
  },
  {
    id: 'U2-P2-B',
    page: 2,
    stem: 'הישרים m ו־n מקבילים. נתון כי הזווית המסומנת היא 137°. חשבו את γ.',
    diagram: {
      topology: 'straight-angle-then-alternate',
      lineLabels: ['m', 'n', 'v'],
      orientationDeg: -5,
      transversalDeg: 121,
      parallelGiven: true,
      givens: ['given angle = 137°'],
      targets: ['γ alternate to the adjacent supplementary angle']
    },
    expected: {
      values: { 'γ': 43 },
      justification: ['זוויות צמודות על ישר משלימות ל־180°.', 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.']
    }
  },
  {
    id: 'U2-P2-C',
    page: 2,
    stem: 'בסרטוט הישרים c ו־d מקבילים. נתון כי ∠F = 72°. מצאו את δ.',
    diagram: {
      topology: 'alternate-then-adjacent-rotated',
      lineLabels: ['c', 'd', 'w'],
      pointLabels: ['F'],
      orientationDeg: 77,
      transversalDeg: 24,
      parallelGiven: true,
      givens: ['∠F = 72°'],
      targets: ['δ adjacent to the angle alternate to ∠F']
    },
    expected: {
      values: { 'δ': 108 },
      justification: ['זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.', 'זוויות צמודות על ישר משלימות ל־180°.']
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
      transversalDeg: 67,
      parallelGiven: true,
      givens: ['∠A = 54°'],
      targets: ['α reachable by corresponding→vertical or vertical→corresponding']
    },
    expected: {
      values: { 'α': 54 },
      justification: ['דרך אפשרית: מתאימות ולאחר מכן קודקודיות.', 'דרך אפשרית: קודקודיות ולאחר מכן מתאימות.']
    }
  },

  // עמוד 3 — טבלאות, בחירת נתונים ושני חותכים
  {
    id: 'U2-P3-A',
    page: 3,
    stem: 'בשרטוט p ∥ q ונתונה זווית שגודלה 38°. השלימו את הטבלה.',
    tableRows: [
      { label: 'הזווית המתאימה', relation: 'מתאימות', value: '' },
      { label: 'הזווית המתחלפת', relation: 'מתחלפות', value: '' },
      { label: 'הזווית הקודקודית', relation: 'קודקודיות', value: '' },
      { label: 'הזווית הצמודה', relation: 'צמודות', value: '' }
    ],
    diagram: {
      topology: 'eight-angles-table',
      lineLabels: ['p', 'q', 't'],
      orientationDeg: 6,
      transversalDeg: 59,
      parallelGiven: true,
      givens: ['reference angle = 38°'],
      targets: ['corresponding', 'alternate', 'vertical', 'adjacent']
    },
    expected: { values: { 'מתאימה': 38, 'מתחלפת': 38, 'קודקודית': 38, 'צמודה': 142 } }
  },
  {
    id: 'U2-P3-B',
    page: 3,
    stem: 'היעזרו בשרטוט ובטבלה. נתון כי ∠A = 52°. מצאו את גודלן של ∠D ושל ∠F.',
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
      transversalDeg: 31,
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
      transversalDeg: 56,
      secondaryTransversalDeg: 118,
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
      transversalDeg: 48,
      secondaryTransversalDeg: 123,
      parallelGiven: true,
      givens: ['∠A = 49° on transversal r', '∠C = 73° on transversal s'],
      targets: ['α corresponding to ∠A', 'β alternate to ∠C']
    },
    expected: {
      values: { 'α': 49, 'β': 73 },
      justification: ['זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.']
    }
  },

  // עמוד 4 — כניסה לאלגברה
  {
    id: 'U2-P4-A',
    page: 4,
    stem: 'בשרטוט p ∥ q. שתי הזוויות המסומנות הן מתאימות וגודליהן (4x + 6)° ו־(2x + 38)°. מצאו את x.',
    diagram: {
      topology: 'corresponding-two-expressions-simple',
      lineLabels: ['p', 'q', 't'],
      orientationDeg: 4,
      transversalDeg: 61,
      parallelGiven: true,
      givens: ['(4x + 6)°', '(2x + 38)°'],
      targets: ['x']
    },
    justificationLane: true,
    expected: { values: { x: 16 }, justification: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U2-P4-B',
    page: 4,
    stem: 'הישרים k ו־m מקבילים. שתי הזוויות המסומנות הן מתחלפות וגודליהן (3x + 17)° ו־(5x − 21)°. מצאו את x.',
    diagram: {
      topology: 'alternate-two-expressions-simple',
      lineLabels: ['k', 'm', 'r'],
      orientationDeg: -8,
      transversalDeg: 119,
      parallelGiven: true,
      givens: ['(3x + 17)°', '(5x − 21)°'],
      targets: ['x']
    },
    justificationLane: true,
    expected: { values: { x: 19 }, justification: 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U2-P4-C',
    page: 4,
    stem: 'בשרטוט a ∥ b. הזוויות המסומנות מתאימות וגודליהן (6x − 9)° ו־(3x + 42)°. מצאו את x ולאחר מכן חשבו את גודל הזווית המסומנת.',
    diagram: {
      topology: 'corresponding-expressions-solve-x-then-angle',
      lineLabels: ['a', 'b', 's'],
      orientationDeg: 71,
      transversalDeg: 26,
      parallelGiven: true,
      givens: ['(6x − 9)°', '(3x + 42)°'],
      targets: ['x', 'marked angle']
    },
    justificationLane: true,
    expected: { values: { x: 17, 'זווית': 93 }, justification: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U2-P4-D',
    page: 4,
    stem: 'בשרטוט הישרים r ו־s מקבילים. גודלי שתי זוויות מתחלפות הם (2x + 35)° ו־(5x − 19)°. בחרו את המשוואה המתאימה, נמקו ופתרו.',
    choices: [
      '2x + 35 = 5x − 19',
      '(2x + 35) + (5x − 19) = 180',
      '2x + 35 = 180 − (5x − 19)',
      '2x + 35 = 5x + 19'
    ],
    diagram: {
      topology: 'alternate-equation-choice',
      lineLabels: ['r', 's', 'u'],
      orientationDeg: 15,
      transversalDeg: 66,
      parallelGiven: true,
      givens: ['(2x + 35)°', '(5x − 19)°'],
      targets: ['correct equation', 'x']
    },
    justificationLane: true,
    expected: { choice: '2x + 35 = 5x − 19', values: { x: 18 }, justification: 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' }
  },

  // עמוד 5 — אלגברה מתקדמת יותר
  {
    id: 'U2-P5-A',
    page: 5,
    stem: 'בשרטוט p ∥ q. גודלי שתי זוויות מתאימות הם (7x − 18)° ו־(3x + 46)°. מצאו את x ואת גודל הזוויות.',
    diagram: {
      topology: 'corresponding-two-expressions-advanced',
      lineLabels: ['p', 'q', 'v'],
      orientationDeg: -17,
      transversalDeg: 58,
      parallelGiven: true,
      givens: ['(7x − 18)°', '(3x + 46)°'],
      targets: ['x', 'angle value']
    },
    justificationLane: true,
    expected: { values: { x: 16, 'זווית': 94 }, justification: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U2-P5-B',
    page: 5,
    stem: 'הישרים c ו־d מקבילים. גודלי שתי זוויות מתחלפות הם (4x + 15)° ו־(2x + 63)°. מצאו את x ואת גודל הזוויות.',
    diagram: {
      topology: 'alternate-two-expressions-advanced',
      lineLabels: ['c', 'd', 'w'],
      orientationDeg: 82,
      transversalDeg: 32,
      parallelGiven: true,
      givens: ['(4x + 15)°', '(2x + 63)°'],
      targets: ['x', 'angle value']
    },
    justificationLane: true,
    expected: { values: { x: 24, 'זווית': 111 }, justification: 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U2-P5-C',
    page: 5,
    stem: 'בשרטוט p ∥ q ושני ישרים חותכים אותם. בזוג אחד נתונות זוויות מתאימות שגודליהן (3x + 12)° ו־72°. בזוג השני נתונות זוויות מתחלפות שגודליהן (2y + 18)° ו־94°. מצאו את x ואת y.',
    diagram: {
      topology: 'two-transversals-two-independent-equations',
      lineLabels: ['p', 'q', 'r', 's'],
      orientationDeg: 9,
      transversalDeg: 49,
      secondaryTransversalDeg: 121,
      parallelGiven: true,
      givens: ['(3x + 12)° corresponds to 72°', '(2y + 18)° alternates with 94°'],
      targets: ['x', 'y']
    },
    justificationLane: true,
    expected: {
      values: { x: 20, y: 38 },
      justification: ['זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.']
    }
  },
  {
    id: 'U2-P5-D',
    page: 5,
    stem: 'שתי הזוויות המסומנות בסרטוט צמודות. תלמיד כתב את המשוואה 2x + 20 = 3x + 35. קבעו אם המשוואה מתאימה לנתונים. אם לא, תקנו אותה, נמקו ומצאו את x.',
    diagram: {
      topology: 'adjacent-angles-error-analysis-with-parallel-context',
      lineLabels: ['a', 'b', 't'],
      orientationDeg: -4,
      transversalDeg: 64,
      parallelGiven: true,
      givens: ['adjacent angles: (2x + 20)° and (3x + 35)°'],
      targets: ['correct equation', 'x']
    },
    justificationLane: true,
    expected: {
      values: { x: 25 },
      justification: 'הזוויות צמודות על ישר ולכן סכומן 180°; המשוואה הנכונה היא (2x + 20) + (3x + 35) = 180.'
    }
  },

  // עמוד 6 — העברה ויישום עצמאי
  {
    id: 'U2-P6-A',
    page: 6,
    stem: 'שני מדפים מקבילים זה לזה ומוט אלכסוני חוצה אותם. הזווית שבין המוט למדף העליון היא 64°. חשבו את הזווית המתאימה לה במפגש עם המדף התחתון.',
    diagram: {
      topology: 'shelves-parallel-diagonal-support',
      lineLabels: ['מדף עליון', 'מדף תחתון', 'מוט'],
      orientationDeg: 2,
      transversalDeg: 55,
      parallelGiven: true,
      givens: ['upper angle = 64°'],
      targets: ['corresponding lower angle']
    },
    expected: { values: { 'זווית': 64 }, justification: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U2-P6-B',
    page: 6,
    stem: 'שני מסילות ישרות מקבילות נחתכות על ידי קו אלכסוני. אחת הזוויות המסומנות היא 118°. חשבו את הזווית המתחלפת לה.',
    diagram: {
      topology: 'parallel-rails-transversal',
      lineLabels: ['מסילה 1', 'מסילה 2', 'חותך'],
      orientationDeg: -12,
      transversalDeg: 123,
      parallelGiven: true,
      givens: ['given angle = 118°'],
      targets: ['alternate angle']
    },
    expected: { values: { 'זווית': 118 }, justification: 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' }
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
      transversalDeg: 61,
      secondaryTransversalDeg: 114,
      parallelGiven: true,
      givens: ['∠A = 128° on transversal r', '∠C = 75° on transversal s'],
      targets: ['α adjacent to the corresponding angle of ∠A']
    },
    expected: {
      values: { 'α': 52 },
      unneededDatum: '∠C = 75°',
      justification: ['זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'זוויות צמודות על ישר משלימות ל־180°.']
    }
  },
  {
    id: 'U2-P6-D',
    page: 6,
    stem: 'הישרים k ו־m מקבילים ונחתכים על ידי שני ישרים. נתון כי ∠A = 41° ו־∠C = 68°. α מתאימה ל־∠A, ו־β צמודה לזווית המתאימה ל־∠C. חשבו את α + β ונמקו בקצרה את שלבי החישוב.',
    diagram: {
      topology: 'two-transversals-final-mixed-synthesis',
      lineLabels: ['k', 'm', 'r', 's'],
      pointLabels: ['A', 'C'],
      orientationDeg: 74,
      transversalDeg: 25,
      secondaryTransversalDeg: 134,
      parallelGiven: true,
      givens: ['∠A = 41°', '∠C = 68°'],
      targets: ['α corresponding to ∠A', 'β adjacent to angle corresponding to ∠C', 'α + β']
    },
    expected: {
      values: { 'α': 41, 'β': 112, 'α + β': 153 },
      justification: ['זוויות מתאימות בין ישרים מקבילים שוות זו לזו.', 'זוויות צמודות על ישר משלימות ל־180°.']
    }
  }
];
