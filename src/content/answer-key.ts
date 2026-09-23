import { CLOZE_BLANK, fillBlank } from './cloze';
import { unit2Questions } from './questions-unit2';
import { unit3Questions } from './questions-unit3';
import { unit4Questions, type Unit4Question } from './questions-unit4';
import { THEOREMS } from './theorems';

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
    note: 'הזווית המסומנת נמצאת במפגש העליון, מתחת לישר העליון ומימין לישר החותך. הזווית המתאימה לה נמצאת באותו מיקום במפגש התחתון: מתחת לישר התחתון ומימין לחותך.',
  },
  {
    id: 'U1-P1-C', unit: 1, page: 1,
    answer: 'יש לסמן במפגש התחתון את הזווית המתחלפת לזווית הנתונה.',
    note: 'הזווית המסומנת נמצאת במפגש העליון, מעל הישר העליון ומשמאל לישר החותך. הזווית המתחלפת לה נמצאת במפגש התחתון, מתחת לישר התחתון ומימין לחותך — שתיהן מחוץ לרצועה שבין הישרים (מתחלפות חיצוניות).',
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
    note: 'ההתאמה כוללת את כל ארבעת זוגות הזוויות המתחלפות: שני זוגות פנימיים ושני זוגות חיצוניים.',
  },
  {
    id: 'U1-P2-B', unit: 1, page: 2,
    answer: [
      'דוגמה לזוג מתאימות: ∠1 ו־∠5.',
      'דוגמה לזוג מתחלפות: ∠1 ו־∠7.',
      'מתאימות נמצאות באותו מיקום יחסי בשני החיתוכים; מתחלפות נמצאות בצדדים מנוגדים של הישר החותך ובמיקומים מתאימים לסוג הזוג.'
    ],
    note: 'הזוגות שלמעלה הם דוגמה בלבד: יש לקבל כל זוג מתאימות וכל זוג מתחלפות שסומן נכון בשרטוט.',
  },
  // One word per line, in line order.
  {
    id: 'U1-P2-C', unit: 1, page: 2,
    answer: ['מקבילים', 'שוות', 'מתאימות'],
    note: `בכל השורות מתקבל המשפט: „${THEOREMS.correspondingDirect.text}”`,
  },
  {
    id: 'U1-P2-D', unit: 1, page: 3,
    answer: ['שוות', 'מתחלפות', 'מקבילים'],
    note: `בכל השורות מתקבל המשפט: „${THEOREMS.alternateDirect.text}”`,
  },
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
  ...(question.note ? { note: question.note } : {}),
}));

const unit3AnswerKey: TeacherAnswerEntry[] = unit3Questions.map(question => ({
  id: question.id,
  unit: 3,
  page: question.page,
  answer: question.expected,
}));

// For a one-word-per-line completion task, the sentence every completed line forms
// (all lines of such a task complete to the same theorem), shown to the teacher.
const completedClozeSentence = (question: Unit4Question): string | null => {
  const lines = question.subparts ?? [];
  const words = question.expected.completions ?? [];
  if (lines.length === 0 || words.length !== lines.length || !lines.every(line => CLOZE_BLANK.test(line))) return null;
  const sentences = new Set(lines.map((line, index) => fillBlank(line, words[index] ?? '')));
  return sentences.size === 1 ? [...sentences][0] ?? null : null;
};

const unit4AnswerKey: TeacherAnswerEntry[] = unit4Questions.map(question => {
  const sentence = completedClozeSentence(question);
  return {
    id: question.id,
    unit: 4,
    page: question.page,
    answer: question.expected,
    ...(sentence ? { note: `בכל השורות מתקבל המשפט: „${sentence}”` } : {}),
  };
});

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
