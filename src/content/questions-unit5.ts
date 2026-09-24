import curriculumManifest from '../../sources/curriculum/bbb-parallel-lines.manifest.json';
export type CurriculumQuestion = {
  id: string;
  sourceSection: string;
  sourceQuestionNumber: number;
  stem: string;
  subparts?: { label: string; text: string }[];
  sourceVisual:
    | { kind: 'generated'; functionName: string }
    | { kind: 'image'; src: string; alt: string };
  answerMode: 'lines' | 'numeric' | 'numeric-justify' | 'proof';
};

// The pinned bbb commit is stated once, in the source manifest (SPEC 0.2 / 12.1).
const BBB_COMMIT = curriculumManifest.sourceCommit;
const RAW_ASSETS = `https://raw.githubusercontent.com/yanivmizrachiy/bbb/${BBB_COMMIT}/geometry8/assets`;

export const unit5Questions: CurriculumQuestion[] = [
  {
    id: 'BBB-G8-T02-PARALLEL-Q1',
    sourceSection: 'ישרים מקבילים — זוויות בין מקבילים',
    sourceQuestionNumber: 1,
    stem: 'בסרטוט שלפניכם, כל זוג זוויות המסומנות באותה אות יוונית הן זוויות מתאימות בין מקבילים (זוויות מתאימות בין ישרים מקבילים שוות זו לזו). זהו ורשמו את כל זוגות הזוויות המתאימות שבסרטוט.',
    sourceVisual: { kind: 'generated', functionName: 't2_fig_islands' },
    answerMode: 'lines',
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q2',
    sourceSection: 'ישרים מקבילים — זוויות בין מקבילים',
    sourceQuestionNumber: 2,
    stem: 'בסרטוט נתונים שני ישרים מקבילים וישר שלישי החותך אותם (נוצרות 8 זוויות).',
    subparts: [
      { label: 'א.', text: 'רשמו זוג של זוויות מתחלפות בין מקבילים.' },
      { label: 'ב.', text: 'רשמו זוג של זוויות חד-צדדיות בין מקבילים (משלימות ל־180°).' },
    ],
    sourceVisual: { kind: 'generated', functionName: 't2_fig_8angles' },
    answerMode: 'lines',
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q3',
    sourceSection: 'ישרים מקבילים — זוויות בין מקבילים',
    sourceQuestionNumber: 3,
    stem: 'משטח הגיהוץ שבתמונה מקביל לרצפה. רגל המשטח יוצרת זווית עם הרצפה. היכן נמצאת הזווית המתחלפת שלה? סמנו והסבירו.',
    sourceVisual: { kind: 'image', src: `${RAW_ASSETS}/t2_iron.png`, alt: 'משטח הגיהוץ מן המקור' },
    answerMode: 'lines',
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q4',
    sourceSection: 'ישרים מקבילים — זוויות בין מקבילים',
    sourceQuestionNumber: 4,
    stem: 'בתמונה מוצג שולחן פיקניק (המושבים מקבילים לקרקע ולמשטח השולחן).',
    subparts: [
      { label: 'א.', text: 'סמנו זוג של זוויות מתחלפות בין מקבילים.' },
      { label: 'ב.', text: 'סמנו זוג של זוויות מתאימות בין מקבילים.' },
    ],
    sourceVisual: { kind: 'image', src: `${RAW_ASSETS}/t2_picnic.png`, alt: 'שולחן הפיקניק מן המקור' },
    answerMode: 'lines',
  },
  {
    id: 'BBB-G8-T02-PARALLEL-Q5',
    sourceSection: 'ישרים מקבילים — זוויות בין מקבילים',
    sourceQuestionNumber: 5,
    stem: 'בסרטוט הנקודות B, E, C, F ממוקמות על ישר אחד. נתון: AC ∥ DF, AB ∥ DE, ∠B = 40°, ∠F = 60°. מהו גודלה של הזווית ∠EGC? נמקו.',
    sourceVisual: { kind: 'generated', functionName: 't2_fig_2tri' },
    answerMode: 'numeric-justify',
  },
  {
    id: 'BBB-G8-T02-TRIANGLE-Q2',
    sourceSection: 'סכום הזוויות במשולש',
    sourceQuestionNumber: 2,
    stem: 'לפניכם סרטוט המשולש ABC. הנקודה D נמצאת על המשך הצלע BC. נתון: AB ∥ EC, ∠A = 65°, ∠ECD = 40°.',
    subparts: [
      { label: 'א.', text: 'מהו גודל הזווית α המסומנת בסרטוט?' },
      { label: 'ב.', text: 'הציגו את דרך החישוב ונמקו כל שלב בפתרון.' },
    ],
    sourceVisual: { kind: 'generated', functionName: 't2_fig_q2' },
    answerMode: 'numeric-justify',
  },
  {
    id: 'BBB-G8-T02-TRIANGLE-Q3',
    sourceSection: 'סכום הזוויות במשולש',
    sourceQuestionNumber: 3,
    stem: 'בסרטוט הישרים k ו־m מקבילים זה לזה, ונתון ∠DAC = 55°. מה הערך של x + y? נמקו.',
    sourceVisual: { kind: 'generated', functionName: 't2_fig_q3km' },
    answerMode: 'numeric-justify',
  },
  {
    id: 'BBB-G8-T03-CONGRUENCE-USE-Q1',
    sourceSection: 'שימושים בחפיפת משולשים',
    sourceQuestionNumber: 1,
    stem: 'שני הקטעים AC ו־BD חוצים זה את זה בנקודה M (כלומר AM = MC ו־BM = MD).',
    subparts: [
      { label: 'א.', text: 'הוכיחו כי △ABM ≅ △CDM (ציינו את המשפט והנימוקים).' },
      { label: 'ב.', text: 'הסיקו מהחפיפה כי AB = CD.' },
      { label: 'ג.', text: 'הסבירו מדוע AB ∥ CD (היעזרו בזוויות מתחלפות).' },
    ],
    sourceVisual: { kind: 'generated', functionName: 'x_segments' },
    answerMode: 'proof',
  },
];

export const unit5SourceLock = {
  repository: 'yanivmizrachiy/bbb',
  commit: BBB_COMMIT,
  immutable: true,
  blockCount: unit5Questions.length,
} as const;
