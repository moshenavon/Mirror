# Mirror – משימות פיתוח

סטטוס: ⬜ לא התחיל · 🟡 בתהליך · ✅ הושלם · 🧑 דורש פעולה מהמשתמש

| # | משימה | סטטוס |
|---|-------|:----:|
| 1 | אפיון ומשימות (`docs/SPEC.md`, `docs/TASKS.md`) | ✅ |
| 2 | שלד פרויקט: Next.js + TypeScript + Tailwind + Vitest + ESLint, RTL ועברית | ✅ |
| 3 | סכמת מסד נתונים ב-Supabase: טבלאות, אינדקסים, טריגרים, RLS, RPC + קובץ migration בריפו | ✅ |
| 4 | בדיקות RLS ב-SQL מול Supabase (סימולציית משתמשים) – הקובץ מוכן, ההרצה ממתינה לאישור | 🧑 |
| 5 | שכבת Supabase בצד ה-Next: clients (browser/server), proxy לרענון session, טיפוסים | ✅ |
| 6 | הזדהות Google: עמוד login, callback, logout, הגנת נתיבים | ✅ |
| 7 | לוגיקה טהורה + unit tests: ולידציה, פענוח מיילים, טווחי תאריכים, בניית שקפי תובנות, סידור שדות | ✅ |
| 8 | מסך "הצוותים שלי" + יצירת צוות | ✅ |
| 9 | מסך דיווח: כפתורים גדולים + dialog שליחה | ✅ |
| 10 | היסטוריית דיווחים: סינון, עריכה, מחיקה | ✅ |
| 11 | הגדרות צוות: פרטים, הרשאת תובנות, שדות, חברים, מחיקת צוות | ✅ |
| 12 | מסך תובנות: טווח תאריכים, סיכום, מצב מצגת | ✅ |
| 13 | בדיקות קומפוננטות (RTL) למסכים המרכזיים | ✅ |
| 14 | פרויקט Vercel + משתני סביבה + דיפלוי | ✅ |
| 15 | README: הרצה מקומית, משתני סביבה, דיפלוי | ✅ |
| 16 | 🧑 הגדרות שדורשות את המשתמש (ראה למטה) | 🧑 |

**Production:** https://mirror-six-gray.vercel.app (פרויקט Vercel: `mirror`, צוות MOSHE)

## שלב 2

| # | משימה | סטטוס |
|---|-------|:----:|
| 17 | מיתוג: צבעים מהלוגו, אייקון אפליקציה, favicon, תמונת שיתוף (OG), manifest | ✅ |
| 18 | הזדהות Google ישירה (Google Cloud OAuth) בלי Supabase Auth: session משלנו + JWT ל-RLS | ⬜ |
| 19 | שליחה אנונימית – ללא שום שיוך למשתמש במסד הנתונים | ⬜ |
| 20 | קישור ציבורי למילוי ללא הזדהות (מנהל מפעיל/מבטל/מחליף קישור) | ⬜ |
| 21 | 10 אימוג'י תלת-ממדיים מונפשים (Noto Animated, Lottie) + בוחר אימוג'י | ⬜ |
| 22 | אנימציות בכל המערכת (כניסה, ריחוף, מעברים, מצגת, קונפטי) | ⬜ |
| 23 | עדכון בדיקות (unit, קומפוננטות, RLS) | ⬜ |
| 24 | דיפלוי + משתני סביבה | ⬜ |

## פעולות שנדרשות מהמשתמש (בסוף)
1. **Google Cloud Console** – יצירת OAuth Client ID (Web application):
   - Authorized redirect URI: `https://kcpbotofdgdrwvuclwck.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Sign In / Providers → Google** – הפעלה והזנת Client ID + Client Secret.
3. **Supabase → Authentication → URL Configuration**:
   - Site URL: כתובת ה-production ב-Vercel.
   - Redirect URLs: `https://<vercel-domain>/auth/callback`, `http://localhost:3000/auth/callback`, ו-`https://*-<team>.vercel.app/auth/callback` ל-previews.
4. **הרצת בדיקות ההרשאות** – להדביק את `supabase/tests/rls_test.sql` ב-Supabase SQL Editor ולהריץ.
   התוצאה הצפויה: `ALL RLS TESTS PASSED` (הכל מתגלגל אחורה, שום דבר לא נשמר).
5. **(אופציונלי) Production branch** – כרגע ה-production ב-Vercel הוא הענף `ccr-54611ef2-h8fn1r`.
   אם תמזג ל-`main`, לעדכן ב-Vercel → Settings → Git את ה-Production Branch.
