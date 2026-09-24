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
  { id: 'U1-P5-A', unit: 1, page: 5, answer: ['משותפות', 'מקבילים'], note: 'ההגדרות: „ישרים מקבילים הם ישרים במישור שאין להם נקודות משותפות” ו„שני קטעים נקראים מקבילים אם הם נמצאים על ישרים מקבילים”.' },
  { id: 'U1-P5-B', unit: 1, page: 5, answer: 'יש להקיף את 1, 4, 6, 7: שתי זוויות בכל מפגש נמצאות בין שני הישרים המקבילים. הזוויות 2, 3, 5, 8 נמצאות מחוץ לישרים.' },
  {
    id: 'U1-P5-C', unit: 1, page: 5,
    answer: ['180°', '110°'],
    note: `השורה הראשונה משלימה את המשפט „${THEOREMS.coInteriorDirect.text}”; בשורה השנייה: 180° − 70° = 110°.`,
  },
  {
    id: 'U1-P5-D', unit: 1, page: 5,
    answer: [
      'לא נכון — זוויות חד-צדדיות בין ישרים מקבילים משלימות ל־180°, אינן שוות.',
      `נכון — ${THEOREMS.coInteriorDirect.text}`,
      'לא נכון — ההשלמה ל־180° מובטחת רק בין ישרים מקבילים; כשהישרים אינם מקבילים סכום הזוויות החד-צדדיות שונה מ־180°.',
    ],
  },
  { id: 'U1-P1-A', unit: 1, page: 1, answer: 'הישר r הוא הישר החותך.' },
  {
    id: 'U1-P1-B', unit: 1, page: 1,
    answer: 'במפגש של הישר t עם הישר m יש לסמן את הזווית שמתחת לישר m ומימין לישר t.',
    note: 'הזווית המסומנת נמצאת במפגש העליון, מתחת לישר העליון ומימין לישר החותך. הזווית המתאימה לה נמצאת באותו מיקום במפגש התחתון: מתחת לישר התחתון ומימין לחותך.',
  },
  {
    id: 'U1-P1-C', unit: 1, page: 1,
    answer: 'במפגש של הישר s עם הישר b יש לסמן את הזווית שמעל הישר b ומימין לישר s — בין שני הישרים ובצד השני של הישר החותך.',
    note: 'הזווית המסומנת נמצאת במפגש העליון, מתחת לישר העליון ומשמאל לישר החותך. הזווית המתחלפת לה נמצאת במפגש התחתון, מעל הישר התחתון ומימין לחותך — שתיהן בין הישרים, בצדדים שונים של החותך. תלמיד שסימן את הזווית שמתחת ל־b ומשמאל ל־s בלבל בין מתחלפות למתאימות.',
  },
  {
    id: 'U1-P1-D', unit: 1, page: 1,
    answer: ['קשת אחת — מתאימות', 'שתי קשתות — מתחלפות', 'קשת מקווקוות — אינן שייכות לאחד משני הסוגים'],
  },
  {
    id: 'U1-P1-E', unit: 1, page: 2,
    answer: ['∠1 ↔ ∠7', '∠2 ↔ ∠5', '∠3 ↔ ∠8', '∠4 ↔ ∠6'],
    note: 'המספור במפגש התחתון אינו באותו סדר כמו במפגש העליון, ולכן ההתאמה אינה „ישר בשורה” בין הטורים: יש להתאים לפי המיקום בשרטוט.',
  },
  {
    id: 'U1-P2-A', unit: 1, page: 2,
    answer: ['∠1 ↔ ∠6', '∠2 ↔ ∠5', '∠3 ↔ ∠8', '∠4 ↔ ∠7'],
    note: 'ההתאמה כוללת את כל ארבעת זוגות הזוויות המתחלפות: שני זוגות פנימיים ושני זוגות חיצוניים.',
  },
  {
    id: 'U1-P2-B', unit: 1, page: 2,
    answer: [
      'דוגמה לזוג מתאימות: ∠1 ו־∠6.',
      'דוגמה לזוג מתחלפות: ∠1 ו־∠5.',
      'זוויות מתאימות נמצאות באותו מיקום בשני המפגשים של החותך עם הישרים: באותו צד של החותך, וכל אחת מהן באותו צד של הישר שלה. זוויות מתחלפות נמצאות בצדדים שונים של החותך, ושתיהן בין הישרים או שתיהן מחוץ לישרים.',
    ],
    note: 'הזוגות שלמעלה הם דוגמה בלבד: יש לקבל כל זוג מתאימות וכל זוג מתחלפות שסומן נכון בשרטוט. אין להסתמך על „למעלה/למטה” בשרטוט הזה — המיקום נקבע ביחס לישרים ולחותך.',
  },
  // One word per line, in line order. Line 1 (the angle type) is decided by the marked pair alone.
  {
    id: 'U1-P2-C', unit: 1, page: 2,
    answer: ['מתאימות', 'מקבילים', 'שוות'],
    note: `שורות 1–2 משלימות את המשפט „${THEOREMS.correspondingDirect.text}”, ושורה 3 את המשפט „${THEOREMS.alternateDirect.text}” את המילה בשורה 1 קובע רק הזוג המסומן בשרטוט — זוג זוויות מתאימות.`,
  },
  {
    id: 'U1-P2-D', unit: 1, page: 3,
    answer: ['מתחלפות', 'שוות', 'מקבילים'],
    note: `שורות 1–2 משלימות את המשפט „${THEOREMS.alternateDirect.text}”, ושורה 3 את המשפט „${THEOREMS.correspondingDirect.text}” את המילה בשורה 1 קובע רק הזוג המסומן בשרטוט — זוג זוויות מתחלפות.`,
  },
  {
    id: 'U1-P2-E', unit: 1, page: 3,
    answer: [
      'לא נכון — עצם היות הזוויות מתחלפות אינו מבטיח שוויון; נדרש שהישרים יהיו מקבילים.',
      `נכון — ${THEOREMS.alternateDirect.text}`,
      `נכון — ${THEOREMS.correspondingDirect.text}`,
    ],
  },
  {
    id: 'U1-P3-A', unit: 1, page: 3,
    answer: `נועה צודקת. בשרטוט שבו הישרים m ו־n מקבילים (מסומנים בחצים) הזוויות המתחלפות המסומנות שוות, כי „${THEOREMS.alternateDirect.text}” בשרטוט השני הישרים אינם מקבילים, ולכן אי אפשר לקבוע שהזוויות שוות — ואכן אחת מהן גדולה מהשנייה. היותן זוויות מתחלפות אינה מספיקה; דניאל שכח את תנאי המקבילות.`,
  },
  {
    id: 'U1-P3-B', unit: 1, page: 4,
    answer: [
      'שורה 1: מתאימות; כן, ניתן לקבוע שהן שוות — הישרים מסומנים כמקבילים.',
      'שורה 2: מתאימות; לא ניתן לקבוע שהן שוות — לא נתון שהישרים מקבילים.',
      'שורה 3: מתחלפות; כן, ניתן לקבוע שהן שוות — הישרים מסומנים כמקבילים.',
      'שורה 4: מתחלפות; לא ניתן לקבוע שהן שוות — לא נתון שהישרים מקבילים.',
    ],
  },
  {
    id: 'U1-P3-C', unit: 1, page: 4, answer: 'הזוג המסומן ג.',
    note: 'ג — זוויות מתחלפות (שתיהן מחוץ לישרים, בצדדים שונים של החותך). ד — זוויות מתאימות. ב — באותו צד של החותך, שתיהן בין הישרים. א — בצדדים שונים של החותך, אך אחת בין הישרים ואחת מחוצה להם, ולכן אינן מתחלפות.',
  },
  {
    id: 'U1-P3-D', unit: 1, page: 4,
    answer: [
      `המשפט המדויק: „${THEOREMS.correspondingDirect.text}”`,
      'חסר התנאי שהישרים מקבילים. בשרטוט השני הישרים h ו־k אינם מקבילים, והזוויות המתאימות המסומנות אינן שוות — לכן המשפט של מאיה, בלי תנאי המקבילות, אינו נכון.',
    ],
    note: `מתקבל גם הניסוח המלא: „${THEOREMS.correspondingDirect.formalText}”`,
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
  ...(question.teacherNote ? { note: question.teacherNote } : {}),
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
  rule: 'אין להמציא או להסיק מפתח תשובות לשאלות מתוך תוכנית הלימודים. יש להוסיף תשובות רק אם נמצא מקור פתרונות מפורש ומאומת ב־BBB או במקור תוכנית הלימודים.',
};

export const answerKeySummary = {
  unit1: unit1AnswerKey.length,
  unit2: unit2AnswerKey.length,
  unit3: unit3AnswerKey.length,
  unit4: unit4AnswerKey.length,
  authoredTotal: teacherAnswerKey.length,
  curriculumSourceBlocksWithoutVerifiedAnswers: 8,
} as const;
