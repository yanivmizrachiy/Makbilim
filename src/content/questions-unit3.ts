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
  expected: {
    choice?: string;
    proof?: string[];
    reason?: string | string[];
    requiredDatum?: string;
  };
};

export const unit3Questions: Unit3Question[] = [
  // עמוד 1 — זיהוי ובחירת נימוק
  {
    id: 'U3-P1-A',
    page: 1,
    stem: 'בשרטוט p ∥ q. נתון כי ∠A ו־∠B הן זוויות מתאימות. בחרו את הנימוק המתאים לטענה ∠A = ∠B.',
    choices: [
      'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
      'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.',
      'זוויות קודקודיות שוות זו לזו.',
      'זוויות צמודות משלימות ל־180°.'
    ],
    diagram: {
      topology: 'proof-reason-corresponding-basic',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B'],
      orientationDeg: 0,
      transversalDeg: 58,
      parallelGivens: ['p ∥ q'],
      target: '∠A = ∠B'
    },
    expected: { choice: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U3-P1-B',
    page: 1,
    stem: 'השלימו את הנימוק החסר בהוכחה.',
    proofLines: [
      { claim: 'p ∥ q', reason: 'נתון' },
      { claim: '∠C = ∠D', reason: '__________' }
    ],
    diagram: {
      topology: 'fill-reason-corresponding',
      lineLabels: ['p', 'q', 'r'],
      pointLabels: ['C', 'D'],
      orientationDeg: 8,
      transversalDeg: 63,
      parallelGivens: ['p ∥ q'],
      target: 'complete reason for ∠C = ∠D'
    },
    expected: { reason: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U3-P1-C',
    page: 1,
    stem: 'התאימו לכל טענה את הנימוק המתאים.',
    subparts: [
      '∠A = ∠B',
      '∠C = ∠D',
      '∠E = ∠F'
    ],
    choices: [
      'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
      'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.',
      'זוויות קודקודיות שוות זו לזו.'
    ],
    diagram: {
      topology: 'claim-reason-matching-three-relations',
      lineLabels: ['k', 'm', 's'],
      pointLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
      orientationDeg: -12,
      transversalDeg: 117,
      parallelGivens: ['k ∥ m'],
      target: 'match each equality to its reason'
    },
    expected: {
      proof: [
        '∠A = ∠B — זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
        '∠C = ∠D — זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.',
        '∠E = ∠F — זוויות קודקודיות שוות זו לזו.'
      ]
    }
  },
  {
    id: 'U3-P1-D',
    page: 1,
    stem: 'בשרטוט a ∥ b. קבעו אם ∠A = ∠C. נמקו את קביעתכם.',
    diagram: {
      topology: 'short-deduction-corresponding-vertical-rotated',
      lineLabels: ['a', 'b', 'u'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 76,
      transversalDeg: 28,
      parallelGivens: ['a ∥ b'],
      givens: ['∠A corresponds to ∠B', '∠B vertical to ∠C'],
      target: '∠A = ∠C'
    },
    expected: {
      proof: [
        '∠A = ∠B — זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
        '∠B = ∠C — זוויות קודקודיות שוות זו לזו.',
        'לכן ∠A = ∠C.'
      ]
    }
  },

  // עמוד 2 — מבנה הוכחה, איתור שגיאה והשלמת חסרים
  {
    id: 'U3-P2-A',
    page: 2,
    stem: 'לפניכם נימוק שכתב תלמיד: „∠A = ∠B כי הן זוויות מתאימות בין ישרים מקבילים”. לפי השרטוט הזוויות הן מתחלפות. מצאו את הטעות ותקנו את הנימוק.',
    diagram: {
      topology: 'proof-error-alternate-mislabeled-corresponding',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B'],
      orientationDeg: 14,
      transversalDeg: 68,
      parallelGivens: ['p ∥ q'],
      target: 'correct justification for ∠A = ∠B'
    },
    expected: { reason: '∠A = ∠B כי זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' }
  },
  {
    id: 'U3-P2-B',
    page: 2,
    stem: 'סדרו את שורות ההוכחה לפי הסדר הנכון.',
    proofLines: [
      { claim: '∠B = ∠C', reason: 'זוויות קודקודיות שוות זו לזו.' },
      { claim: 'p ∥ q', reason: 'נתון' },
      { claim: '∠A = ∠B', reason: 'זוויות מתאימות בין ישרים מקבילים שוות זו לזו.' },
      { claim: '∠A = ∠C', reason: 'מכלל המעבר' }
    ],
    diagram: {
      topology: 'order-four-proof-lines',
      lineLabels: ['p', 'q', 'r'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: -5,
      transversalDeg: 55,
      parallelGivens: ['p ∥ q'],
      target: 'prove ∠A = ∠C'
    },
    expected: {
      proof: [
        'p ∥ q — נתון.',
        '∠A = ∠B — זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
        '∠B = ∠C — זוויות קודקודיות שוות זו לזו.',
        '∠A = ∠C — מכלל המעבר.'
      ]
    }
  },
  {
    id: 'U3-P2-C',
    page: 2,
    stem: 'השלימו את השורה החסרה בהוכחה.',
    proofLines: [
      { claim: 'k ∥ m', reason: 'נתון' },
      { claim: '__________', reason: 'זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.' },
      { claim: '∠B = ∠C', reason: 'זוויות קודקודיות שוות זו לזו.' },
      { claim: '∠A = ∠C', reason: 'מכלל המעבר' }
    ],
    diagram: {
      topology: 'fill-proof-claim-alternate-then-vertical',
      lineLabels: ['k', 'm', 's'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 81,
      transversalDeg: 33,
      parallelGivens: ['k ∥ m'],
      target: 'complete ∠A = ∠B'
    },
    expected: { reason: 'השורה החסרה: ∠A = ∠B.' }
  },
  {
    id: 'U3-P2-D',
    page: 2,
    stem: 'המטרה היא להוכיח כי ∠A = ∠B. איזה מן הנתונים הנוספים שלהלן מספיק לבדו להשלמת ההוכחה? נמקו.',
    choices: [
      'p ∥ q',
      'r ∥ s',
      '∠C = 90°',
      'AB = CD'
    ],
    diagram: {
      topology: 'proof-data-selection-four-lines',
      lineLabels: ['p', 'q', 'r', 's'],
      pointLabels: ['A', 'B', 'C', 'D'],
      orientationDeg: 19,
      transversalDeg: 62,
      secondaryTransversalDeg: 124,
      parallelGivens: [],
      givens: ['∠A and ∠B occupy corresponding positions relative to p, q and transversal r'],
      target: 'select sufficient given to prove ∠A = ∠B'
    },
    expected: {
      choice: 'p ∥ q',
      requiredDatum: 'p ∥ q',
      reason: 'לאחר הנתון p ∥ q, הזוויות ∠A ו־∠B הן זוויות מתאימות בין ישרים מקבילים ולכן הן שוות.'
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
      givens: ['∠A corresponds to ∠B', '∠B vertical to ∠C'],
      target: '∠A = ∠C'
    },
    expected: {
      proof: [
        '∠A = ∠B — זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
        '∠B = ∠C — זוויות קודקודיות שוות זו לזו.',
        'לכן ∠A = ∠C.'
      ]
    }
  },
  {
    id: 'U3-P3-B',
    page: 3,
    stem: 'נתון k ∥ m. הוכיחו כי ∠A + ∠C = 180°.',
    diagram: {
      topology: 'full-proof-alternate-then-adjacent-supplementary',
      lineLabels: ['k', 'm', 'r'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 72,
      transversalDeg: 27,
      parallelGivens: ['k ∥ m'],
      givens: ['∠A alternates with ∠B', '∠B adjacent to ∠C'],
      target: '∠A + ∠C = 180°'
    },
    expected: {
      proof: [
        '∠A = ∠B — זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.',
        '∠B + ∠C = 180° — זוויות צמודות על ישר משלימות ל־180°.',
        'לכן ∠A + ∠C = 180°.'
      ]
    }
  },
  {
    id: 'U3-P3-C',
    page: 3,
    stem: 'נתון a ∥ b וכן ∠E = 35°. הוכיחו כי ∠A = ∠D. ציינו אם הנתון ∠E = 35° נחוץ להוכחה.',
    diagram: {
      topology: 'proof-extra-data-two-transversals',
      lineLabels: ['a', 'b', 'r', 's'],
      pointLabels: ['A', 'B', 'D', 'E'],
      orientationDeg: 11,
      transversalDeg: 51,
      secondaryTransversalDeg: 126,
      parallelGivens: ['a ∥ b'],
      givens: ['∠A corresponds to ∠B on transversal r', '∠B vertical to ∠D', '∠E = 35° on transversal s'],
      target: '∠A = ∠D'
    },
    expected: {
      proof: [
        '∠A = ∠B — זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
        '∠B = ∠D — זוויות קודקודיות שוות זו לזו.',
        'לכן ∠A = ∠D.',
        'הנתון ∠E = 35° אינו נחוץ להוכחה.'
      ]
    }
  },
  {
    id: 'U3-P3-D',
    page: 3,
    stem: 'שני תלמידים כתבו הוכחה לטענה ∠A = ∠C. קבעו איזו הוכחה נכונה ונמקו.',
    subparts: [
      'הוכחה א: ∠A = ∠B כי הן זוויות מתאימות בין p ∥ q; ∠B = ∠C כי הן קודקודיות; לכן ∠A = ∠C.',
      'הוכחה ב: ∠A = ∠C כי שתיהן זוויות מתחלפות, ולכן הן שוות.'
    ],
    diagram: {
      topology: 'compare-two-proofs-same-target',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: -9,
      transversalDeg: 64,
      parallelGivens: ['p ∥ q'],
      givens: ['∠A corresponds to ∠B', '∠B vertical to ∠C', '∠A and ∠C are not an alternate pair'],
      target: 'evaluate two proofs of ∠A = ∠C'
    },
    expected: {
      choice: 'הוכחה א',
      reason: 'הוכחה א משתמשת בשני קשרים תקפים. בהוכחה ב הזוויות ∠A ו־∠C אינן זוג זוויות מתחלפות ולכן הנימוק אינו תקף.'
    }
  }
];
