from pathlib import Path

SPEC_PATH = Path('SPEC.md')
MARKER = '## 1.1 תצוגה בנייד, הורדה והדפסה'
ANCHOR = '\n---\n\n# 2. Corpus המקורות'
SECTION = '''

## 1.1 תצוגה בנייד, הורדה והדפסה

- תצוגת הטלפון היא viewport של אותם דפי A4 קנוניים בגודל 210×297 מ״מ. מותרת הקטנה אחידה בלבד להתאמה לרוחב המסך; אסור לבצע reflow, לשנות יחס, להזיז תוכן או לשנות את עימוד הדף.
- קנה המידה בנייד נשאר יציב בזמן גלילה ואינו משתנה בעקבות פתיחה/סגירה של סרגלי הדפדפן. שינוי קנה מידה מותר רק כאשר כיוון המסך משתנה.
- בממשק החוברת הפונה למשתמש קיימות שתי פעולות מסך בלבד: **„הורדה”** ו־**„הדפסה”**.
- **„הורדה”** מורידה את PDF התלמיד המאומת מאותו build שנפרס לאתר, ולא PDF ישן או קובץ חיצוני שאינו קשור לגרסה החיה.
- **„הדפסה”** פותחת את מנגנון ההדפסה של הדפדפן ומדפיסה את דפי החוברת כ־A4 נקי; כפתורי המסך וכל chrome של התצוגה אינם נכנסים להדפסה.
- אין בממשק הקנוני מצלמה, וידאו, AR או פעולה אחרת שאינה הורדה/הדפסה. תוספת כפתור או capability נוסף מחייבת קודם עדכון מפורש של `SPEC.md`.

שער: `mobile-viewer-contract`.
'''

text = SPEC_PATH.read_text(encoding='utf-8')
if MARKER in text:
    print('SPEC mobile contract already present')
    raise SystemExit(0)
if ANCHOR not in text:
    raise SystemExit('SPEC anchor not found; refusing to guess insertion point')
SPEC_PATH.write_text(text.replace(ANCHOR, SECTION + ANCHOR, 1), encoding='utf-8')
print('SPEC mobile contract inserted')
