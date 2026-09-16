export type Unit4Question = {
  id: string;
  page: number;
  stem: string;
  subparts?: string[];
  choices?: string[];
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
  };
};

export const unit4Questions: Unit4Question[] = [
  // עמוד 1 — שפה והפעלה ראשונה של המשפטים ההפוכים
  {
    id: 'U4-P1-A',
    page: 1,
    stem: 'השלימו את המשפט: אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתאימות ______ זו לזו, אז שני הישרים ______.',
    expected: { completions: ['שוות', 'מקבילים'] }
  },
  {
    id: 'U4-P1-B',
    page: 1,
    stem: 'השלימו את המשפט: אם שני ישרים נחתכים על ידי ישר שלישי, וזוג זוויות מתחלפות ______ זו לזו, אז שני הישרים ______.',
    expected: { completions: ['שוות', 'מקבילים'] }
  },
  {
    id: 'U4-P1-C',
    page: 1,
    stem: 'קבעו ליד כל טענה אם היא משפט ישיר או משפט הפוך.',
    subparts: [
      'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, אז זוויות מתאימות שוות זו לזו.',
      'אם שני ישרים נחתכים על ידי ישר שלישי וזוויות מתאימות שוות זו לזו, אז שני הישרים מקבילים.',
      'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, אז זוויות מתחלפות שוות זו לזו.',
      'אם שני ישרים נחתכים על ידי ישר שלישי וזוויות מתחלפות שוות זו לזו, אז שני הישרים מקבילים.'
    ],
    expected: { completions: ['ישיר', 'הפוך', 'ישיר', 'הפוך'] }
  },
  {
    id: 'U4-P1-D',
    page: 1,
    stem: 'בשרטוט שני ישרים נחתכים על ידי ישר שלישי. נתון כי ∠A = 67° ו־∠B = 67°, והזוויות ∠A ו־∠B מתאימות. קבעו אם p ∥ q. נמקו.',
    diagram: {
      topology: 'converse-corresponding-equal-numeric',
      lineLabels: ['p', 'q', 't'],
      pointLabels: ['A', 'B'],
      orientationDeg: 6,
      transversalDeg: 61,
      parallelGiven: false,
      givens: ['∠A = 67°', '∠B = 67°', '∠A and ∠B are corresponding'],
      target: 'determine p ∥ q'
    },
    expected: {
      conclusion: 'p ∥ q',
      reason: 'אם שני ישרים נחתכים על ידי ישר שלישי וזוג זוויות מתאימות שוות זו לזו, אז שני הישרים מקבילים.'
    }
  },
  {
    id: 'U4-P2-A',
    page: 2,
    stem: 'בשרטוט שני ישרים נחתכים על ידי ישר שלישי. נתון כי ∠C = 112° ו־∠D = 112°, והזוויות ∠C ו־∠D מתחלפות. קבעו אם k ∥ m. נמקו.',
    diagram: {
      topology: 'converse-alternate-equal-numeric',
      lineLabels: ['k', 'm', 'r'],
      pointLabels: ['C', 'D'],
      orientationDeg: -13,
      transversalDeg: 118,
      parallelGiven: false,
      givens: ['∠C = 112°', '∠D = 112°', '∠C and ∠D are alternate'],
      target: 'determine k ∥ m'
    },
    expected: {
      conclusion: 'k ∥ m',
      reason: 'אם שני ישרים נחתכים על ידי ישר שלישי וזוג זוויות מתחלפות שוות זו לזו, אז שני הישרים מקבילים.'
    }
  },
  {
    id: 'U4-P2-B',
    page: 2,
    stem: 'באיזה מן המקרים אפשר לקבוע שהישרים p ו־q מקבילים? בחרו ונמקו.',
    choices: [
      'זוג זוויות מתאימות בין p ו־q שוות זו לזו.',
      'זוג זוויות קודקודיות שוות זו לזו.',
      'שתי זוויות צמודות שסכומן 180° באותו חיתוך.',
      'שתי זוויות שוות הנמצאות באותו קודקוד.'
    ],
    diagram: {
      topology: 'converse-data-sufficiency-four-cases',
      lineLabels: ['p', 'q', 't'],
      orientationDeg: 78,
      transversalDeg: 30,
      parallelGiven: false,
      givens: ['four candidate angle relations'],
      target: 'select sufficient condition for p ∥ q'
    },
    expected: {
      choice: 'זוג זוויות מתאימות בין p ו־q שוות זו לזו.',
      reason: 'שוויון של זוג זוויות מתאימות הנוצרות על ידי חותך מספיק לקביעת מקבילות באמצעות המשפט ההפוך.'
    }
  },
  {
    id: 'U4-P2-C',
    page: 2,
    stem: 'הישרים p ו־q נחתכים על ידי ישר שלישי. גודלי שתי זוויות מתאימות הם (3x + 14)° ו־(5x − 26)°. מצאו את x כך שניתן יהיה לקבוע כי p ∥ q. נמקו.',
    diagram: {
      topology: 'converse-algebra-corresponding',
      lineLabels: ['p', 'q', 't'],
      orientationDeg: -7,
      transversalDeg: 64,
      parallelGiven: false,
      givens: ['corresponding angles: (3x + 14)° and (5x − 26)°'],
      target: 'find x that guarantees p ∥ q'
    },
    justificationLane: true,
    expected: {
      values: { x: 20, 'זווית': 74 },
      conclusion: 'p ∥ q',
      reason: [
        'כדי להפעיל את המשפט ההפוך יש להשוות את הזוויות המתאימות.',
        '3x + 14 = 5x − 26, ולכן x = 20.',
        'עבור x = 20 שתי הזוויות שוות ל־74°, ולכן p ∥ q.'
      ]
    }
  },
  {
    id: 'U4-P2-D',
    page: 2,
    stem: 'נתון p ∥ q. בשרטוט ∠A מתאימה ל־∠B, ונתון גם כי ∠A = ∠C. הזוויות ∠B ו־∠C מתאימות ביחס לישרים q ו־r. הוכיחו כי q ∥ r.',
    diagram: {
      topology: 'combined-direct-and-converse-three-lines',
      lineLabels: ['p', 'q', 'r', 't'],
      pointLabels: ['A', 'B', 'C'],
      orientationDeg: 12,
      transversalDeg: 57,
      parallelGiven: true,
      parallelGivens: ['p ∥ q'],
      givens: ['p ∥ q', '∠A corresponds to ∠B', '∠A = ∠C', '∠B and ∠C are corresponding relative to q and r'],
      target: 'prove q ∥ r'
    },
    expected: {
      conclusion: 'q ∥ r',
      proof: [
        '∠A = ∠B — זוויות מתאימות בין הישרים המקבילים p ו־q שוות זו לזו.',
        '∠A = ∠C — נתון.',
        'לכן ∠B = ∠C — מכלל המעבר.',
        '∠B ו־∠C הן זוויות מתאימות ביחס לישרים q ו־r.',
        'לכן q ∥ r — לפי המשפט ההפוך של זוויות מתאימות.'
      ]
    }
  }
];
