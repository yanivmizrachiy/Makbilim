import { unit2Questions } from './questions-unit2';
import { unit3Questions } from './questions-unit3';
import { unit4Questions } from './questions-unit4';

export type TeacherAnswerEntry = {
  id: string;
  unit: 1 | 2 | 3 | 4;
  page: number;
  answer: unknown;
  note?: string;
};

const unit1AnswerKey: TeacherAnswerEntry[] = [
  { id: 'U1-P1-A', unit: 1, page: 1, answer: 'הישר r הוא הישר החותך.' },
  {
    id: 'U1-P1-B', unit: 1, page: 1,
    answer: 'יש לסמן במפגש התחתון את הזווית הנמצאת באותו מיקום יחסי לזווית הנתונה.',
    note: 'זוויות מתאימות: אותו מיקום יחסי בשני החיתוכים.',
  },
  {
    id: 'U1-P1-C', unit: 1, page: 1,
    answer: 'יש לסמן במפגש התחתון את הזווית המתחלפת לזווית הנתונה.',
    note: 'במיפוי הסקטורים של השרטוט: top-1 ↔ bottom-3.',
  },
  {
    id: 'U1-P1-D', unit: 1, page: 1,
    answer: ['קשת אחת — מתאימות', 'שתי קשתות — מתחלפות', 'קשת מקווקוות — אינן שייכות לאחד משני הסוגים'],
  },
  {
    id: 'U1-P1-E', unit: 1, page: 2,
    answer: ['∠1 ↔ ∠5', '∠2 ↔ ∠6', '∠3 ↔ ∠7', '∠4 ↔ ∠8'],
  },
  {
    id: 'U1-P2-A', unit: 1, page: 2,
    answer: ['∠1 ↔ ∠7', '∠2 ↔ ∠8', '∠3 ↔ ∠5', '∠4 ↔ ∠6'],
    note: 'המיפוי כולל את כל ארבעת זוגות הזוויות המתחלפות — פנימיים וחיצוניים.',
  },
  {
    id: 'U1-P2-B', unit: 1, page: 2,
    answer: [
      'דוגמה לזוג מתאימות: ∠1 ו־∠5.',
      'דוגמה לזוג מתחלפות: ∠1 ו־∠7.',
      'מתאימות נמצאות באותו מיקום יחסי בשני החיתוכים; מתחלפות נמצאות בצדדים מנוגדים של הישר החותך ובמיקומים מתאימים לסוג הזוג.'
    ],
    note: 'ייתכנו זוגות נכונים נוספים בהתאם למספור שבשרטוט.',
  },
  { id: 'U1-P2-C', unit: 1, page: 2, answer: 'מקבילים' },
  { id: 'U1-P2-D', unit: 1, page: 3, answer: 'מתחלפות' },
  {
    id: 'U1-P2-E', unit: 1, page: 3,
    answer: [
      'לא נכון — עצם היות הזוויות מתחלפות אינו מבטיח שוויון; נדרש שהישרים יהיו מקבילים.',
      'נכון — זוויות מתחלפות בין ישרים מקבילים שוות זו לזו.',
      'נכון — זוויות מתאימות בין ישרים מקבילים שוות זו לזו.',
    ],
  },
  {
    id: 'U1-P3-A', unit: 1, page: 3,
    answer: 'נועה צודקת. השוויון של זוויות מתחלפות מובטח כאשר שני הישרים מקבילים ונחתכים על ידי ישר שלישי.',
  },
  {
    id: 'U1-P3-B', unit: 1, page: 4,
    answer: [
      'שורה 1: מתאימות; כן, ניתן לקבוע שהן שוות — הישרים מקבילים.',
      'שורה 2: מתאימות; לא ניתן לקבוע שהן שוות — לא נתון שהישרים מקבילים.',
      'שורה 3: מתחלפות; כן, ניתן לקבוע שהן שוות — הישרים מקבילים.',
      'שורה 4: מתחלפות; לא ניתן לקבוע שהן שוות — לא נתון שהישרים מקבילים.',
    ],
  },
  { id: 'U1-P3-C', unit: 1, page: 4, answer: 'הזוג המסומן ג.' },
  {
    id: 'U1-P3-D', unit: 1, page: 4,
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

export const teacherAnswerKey: TeacherAnswerEntry[] = [
  ...unit1AnswerKey,
  ...unit2AnswerKey,
  ...unit3AnswerKey,
  ...unit4AnswerKey,
];

export const curriculumAnswerKeyPolicy = {
  unit: 5,
  sourceRepository: 'yanivmizrachiy/bbb',
  selectedSourceBlocks: 8,
  status: 'not-provided-by-verified-source' as const,
  rule: 'אין להמציא או להסיק מפתח תשובות ליחידה 5. יש להוסיף תשובות רק אם נמצא מקור פתרונות מפורש ומאומת ב־BBB או במקור תוכנית הלימודים.',
};

export const answerKeySummary = {
  unit1: unit1AnswerKey.length,
  unit2: unit2AnswerKey.length,
  unit3: unit3AnswerKey.length,
  unit4: unit4AnswerKey.length,
  authoredTotal: teacherAnswerKey.length,
  curriculumSourceBlocksWithoutVerifiedAnswers: 8,
} as const;
