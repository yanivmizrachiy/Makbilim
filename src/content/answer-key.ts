import { unit2Questions } from './questions-unit2';
import { unit3Questions } from './questions-unit3';
import { unit4Questions } from './questions-unit4';

export type TeacherAnswerEntry = {
  id: string;
  unit: 1 | 2 | 3 | 4 | 5;
  page: number;
  answer: unknown;
  note?: string;
};

const unit1AnswerKey: TeacherAnswerEntry[] = [
  {
    id: 'U1-P1-A', unit: 1, page: 1,
    answer: 'הישר r הוא הישר החותך.',
  },
  {
    id: 'U1-P1-B', unit: 1, page: 1,
    answer: 'יש לסמן במפגש התחתון את הזווית הנמצאת באותו מיקום יחסי לזווית הנתונה.',
  },
  {
    id: 'U1-P1-C', unit: 1, page: 1,
    answer: 'יש לסמן במפגש התחתון את הזווית המתחלפת — בצד הנגדי של החותך ובמיקום המתחלף המתאים.',
  },
  {
    id: 'U1-P1-D', unit: 1, page: 1,
    answer: ['קשת אחת — מתאימות', 'שתי קשתות — מתחלפות', 'קשת מקווקוות — אינן שייכות לאחד משני הסוגים'],
  },
  {
    id: 'U1-P1-E', unit: 1, page: 1,
    answer: ['∠1 ↔ ∠5', '∠2 ↔ ∠6', '∠3 ↔ ∠7', '∠4 ↔ ∠8'],
  },
  {
    id: 'U1-P2-A', unit: 1, page: 2,
    answer: ['∠1 ↔ ∠7', '∠2 ↔ ∠8', '∠3 ↔ ∠5', '∠4 ↔ ∠6'],
    note: 'המיפוי כולל זוגות מתחלפים פנימיים וחיצוניים לפי סימון שמונת האזורים בשרטוט.',
  },
  {
    id: 'U1-P2-B', unit: 1, page: 2,
    answer: ['קשת אחת — מתאימות', 'שתי קשתות — מתחלפות', 'קשת מקווקוות — אינן שייכות לאחד משני הסוגים'],
  },
  {
    id: 'U1-P2-C', unit: 1, page: 2,
    answer: ['מקבילים', 'שוות'],
  },
  {
    id: 'U1-P2-D', unit: 1, page: 2,
    answer: ['מקבילים', 'שוות'],
  },
  {
    id: 'U1-P2-E', unit: 1, page: 2,
    answer: [
      'לא נכון — עצם היות הזוויות מתחלפות אינו מבטיח שוויון; נדרש שהישרים יהיו מקבילים.',
      'נכון.',
      'נכון.',
    ],
  },
  {
    id: 'U1-P3-A', unit: 1, page: 3,
    answer: 'נועה צודקת. השוויון של זוויות מתחלפות מובטח כאשר שני הישרים מקבילים ונחתכים על ידי ישר שלישי.',
  },
  {
    id: 'U1-P3-B', unit: 1, page: 3,
    answer: [
      'שורה 1: מתאימות; ניתן לקבוע שהן שוות משום שהישרים מקבילים.',
      'שורה 2: מתחלפות; לא ניתן לקבוע שהן שוות משום שלא נתון שהישרים מקבילים.',
      'שורה 3: מתאימות; ניתן לקבוע שהן שוות משום שהישרים מקבילים.',
      'שורה 4: מתחלפות; לא ניתן לקבוע שהן שוות משום שלא נתון שהישרים מקבילים.',
    ],
  },
  {
    id: 'U1-P3-C', unit: 1, page: 3,
    answer: 'הזוג המסומן ג.',
  },
  {
    id: 'U1-P3-D', unit: 1, page: 3,
    answer: 'אם שני ישרים מקבילים נחתכים על ידי ישר שלישי, אז כל זוג זוויות מתאימות שוות זו לזו.',
  },
];

const unit2AnswerKey: TeacherAnswerEntry[] = unit2Questions.map(question => ({
  id: question.id,
  unit: 2,
  page: question.page,
  answer: question.expected,
}));

const unit3AnswerKey: TeacherAnswerEntry[] = unit3Questions.map(question => ({
  id: question.id,
  unit: 3,
  page: question.page,
  answer: question.expected,
}));

const unit4AnswerKey: TeacherAnswerEntry[] = unit4Questions.map(question => ({
  id: question.id,
  unit: 4,
  page: question.page,
  answer: question.expected,
}));

const unit5AnswerKey: TeacherAnswerEntry[] = [
  {
    id: 'BBB-G8-T02-PARALLEL-Q1', unit: 5, page: 1,
    answer: 'יש לרשום את זוגות הזוויות המתאימות לפי האות היוונית הזהה המופיעה בשני החיתוכים.',
    note: 'שאלת זיהוי פתוחה; מתקבל כל רישום מלא ונכון בהתאם לסימון המקורי.',
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q2', unit: 5, page: 1,
    answer: [
      'א. מתקבל כל זוג נכון של זוויות מתחלפות בין המקבילים.',
      'ב. מתקבל כל זוג נכון של זוויות חד־צדדיות בין המקבילים; סכומן 180°.',
    ],
    note: 'לשאלה יש יותר מתשובה אפשרית אחת בהתאם לזוג שנבחר בשרטוט.',
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q3', unit: 5, page: 2,
    answer: 'יש לסמן על משטח הגיהוץ את הזווית הנמצאת בצד הנגדי של רגל המשטח ביחס לזווית עם הרצפה, במיקום של זוויות מתחלפות.',
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q4', unit: 5, page: 2,
    answer: [
      'א. מתקבל כל זוג נכון של זוויות מתחלפות הנוצרות כאשר אחד מקווי המבנה חותך שניים מן הישרים המקבילים.',
      'ב. מתקבל כל זוג נכון של זוויות מתאימות באותה מערכת.',
    ],
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q5', unit: 5, page: 3,
    answer: {
      value: '∠EGC = 80°',
      reasoning: [
        'מן הנתון AB ∥ DE מתקבל שכיוון DE יוצר עם הישר BECF זווית של 40°.',
        'מן הנתון AC ∥ DF ומ־∠F = 60° מתקבל שכיוון AC יוצר עם אותו ישר זווית של 60° מן הצד השני.',
        'לכן הזווית שבין GE ובין GC היא 180° − 40° − 60° = 80°.',
      ],
    },
  },
  {
    id: 'BBB-G8-T02-TRIANGLE-Q2', unit: 5, page: 3,
    answer: {
      value: 'α = 75°',
      reasoning: [
        'AB ∥ EC ולכן הזווית בין AC ובין EC שווה ל־65°.',
        '∠ECD = 40°, ולכן ∠ACD = 65° + 40° = 105°.',
        'B, C, D על ישר אחד, ולכן α = 180° − 105° = 75°.',
      ],
    },
  },
  {
    id: 'BBB-G8-T02-TRIANGLE-Q3', unit: 5, page: 4,
    answer: {
      value: 'x + y = 180°',
      reasoning: 'הזוויות x ו־y הן זוויות חד־צדדיות הנוצרות על ידי החותך AB בין הישרים המקבילים k ו־m, ולכן סכומן 180°. הנתון ∠DAC = 55° אינו נחוץ לקביעה זו.',
    },
  },
  {
    id: 'BBB-G8-T03-CONGRUENCE-USE-Q1', unit: 5, page: 4,
    answer: {
      proof: [
        'AM = MC ו־BM = MD — נתון.',
        '∠AMB = ∠CMD — זוויות קודקודיות.',
        'לכן △ABM ≅ △CDM לפי צלע־זווית־צלע.',
        'מכאן AB = CD — צלעות מתאימות במשולשים חופפים.',
        'מן החפיפה מתקבל גם שוויון של זוג זוויות מתחלפות המתאימות לישרים AB ו־CD; לכן AB ∥ CD.',
      ],
    },
  },
];

export const teacherAnswerKey: TeacherAnswerEntry[] = [
  ...unit1AnswerKey,
  ...unit2AnswerKey,
  ...unit3AnswerKey,
  ...unit4AnswerKey,
  ...unit5AnswerKey,
];

export const answerKeySummary = {
  unit1: unit1AnswerKey.length,
  unit2: unit2AnswerKey.length,
  unit3: unit3AnswerKey.length,
  unit4: unit4AnswerKey.length,
  unit5: unit5AnswerKey.length,
  total: teacherAnswerKey.length,
} as const;
