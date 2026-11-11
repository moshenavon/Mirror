# Mirror – משימות פיתוח

סטטוס: ⬜ לא התחיל · 🟡 בתהליך · ✅ הושלם · 🧑 דורש פעולה מהמשתמש

| # | משימה | סטטוס |
|---|-------|:----:|
| 1 | אפיון ומשימות (`docs/SPEC.md`, `docs/TASKS.md`) | ✅ |
| 2 | שלד פרויקט: Next.js + TypeScript + Tailwind + Vitest + ESLint, RTL ועברית | ⬜ |
| 3 | סכמת מסד נתונים ב-Supabase: טבלאות, אינדקסים, טריגרים, RLS, RPC + קובץ migration בריפו | ⬜ |
| 4 | בדיקות RLS ב-SQL מול Supabase (סימולציית משתמשים) | ⬜ |
| 5 | שכבת Supabase בצד ה-Next: clients (browser/server), proxy לרענון session, טיפוסים | ⬜ |
| 6 | הזדהות Google: עמוד login, callback, logout, הגנת נתיבים | ⬜ |
| 7 | לוגיקה טהורה + unit tests: ולידציה, פענוח מיילים, טווחי תאריכים, בניית שקפי תובנות, סידור שדות | ⬜ |
| 8 | מסך "הצוותים שלי" + יצירת צוות | ⬜ |
| 9 | מסך דיווח: כפתורים גדולים + dialog שליחה | ⬜ |
| 10 | היסטוריית דיווחים: סינון, עריכה, מחיקה | ⬜ |
| 11 | הגדרות צוות: פרטים, הרשאת תובנות, שדות, חברים, מחיקת צוות | ⬜ |
| 12 | מסך תובנות: טווח תאריכים, סיכום, מצב מצגת | ⬜ |
| 13 | בדיקות קומפוננטות (RTL) למסכים המרכזיים | ⬜ |
| 14 | פרויקט Vercel + משתני סביבה + דיפלוי | ⬜ |
| 15 | README: הרצה מקומית, משתני סביבה, דיפלוי | ⬜ |
| 16 | 🧑 הגדרות שדורשות את המשתמש (ראה למטה) | 🧑 |

## פעולות שנדרשות מהמשתמש (בסוף)
1. **Google Cloud Console** – יצירת OAuth Client ID (Web application):
   - Authorized redirect URI: `https://kcpbotofdgdrwvuclwck.supabase.co/auth/v1/callback`
2. **Supabase → Authentication → Sign In / Providers → Google** – הפעלה והזנת Client ID + Client Secret.
3. **Supabase → Authentication → URL Configuration**:
   - Site URL: כתובת ה-production ב-Vercel.
   - Redirect URLs: `https://<vercel-domain>/auth/callback`, `http://localhost:3000/auth/callback`, ו-`https://*-<team>.vercel.app/auth/callback` ל-previews.
