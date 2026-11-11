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
| 18 | הזדהות Google ישירה (Google Cloud OAuth) בלי Supabase Auth: session משלנו + JWT ל-RLS | ✅ |
| 19 | שליחה אנונימית – ללא שום שיוך למשתמש במסד הנתונים | ✅ |
| 20 | קישור ציבורי למילוי ללא הזדהות (מנהל מפעיל/מבטל/מחליף קישור) | ✅ |
| 21 | 10 אימוג'י תלת-ממדיים מונפשים (Noto Animated, Lottie) + בוחר אימוג'י | ✅ |
| 22 | אנימציות בכל המערכת (כניסה, ריחוף, מעברים, מצגת, קונפטי) | ✅ |
| 23 | עדכון בדיקות (unit, קומפוננטות, RLS) | ✅ |
| 24 | דיפלוי + משתני סביבה (SESSION_SECRET, NEXT_PUBLIC_SITE_URL הוגדרו; Google + JWT secret ממתינים) | 🧑 |

> שלב 2: הקוד הושלם ונבדק (112 בדיקות). המיגרציה `20261111150000_own_auth_anonymous_public.sql` ממתינה להחלה ב-Supabase.

## שלב 3 – הישגים

| # | משימה | סטטוס |
|---|-------|:----:|
| 25 | מסך הישגים: מפת דרגות אנכית (0/10/20/50/100), תמונות המשתתפים לפי כמות דיווחים, כרטיס "הדרגה שלי", חגיגת עליית דרגה | ✅ |
| 26 | RPC `get_achievements` + בדיקות RLS + בדיקות unit וקומפוננטות | ✅ |
| 27 | 🧑 להחיל את המיגרציה `20261111180000_achievements.sql` ב-Supabase | 🧑 |

## שלב 4 – Action items

| # | משימה | סטטוס |
|---|-------|:----:|
| 28 | טבלת `action_items` + RPC (יצירה, רשימה, סימון בוצע, מחיקה) – migration `20261111190000_action_items.sql` | ✅ |
| 29 | כפתור "יצירת Action Item" בכל שקף במצגת הרטרו + חלון יצירה | ✅ |
| 30 | מסך משימות: סימון בוצע, ירידה לתחתית, קו חוצה וחיווי ירוק, מחיקה | ✅ |
| 31 | בדיקות (unit, קומפוננטות, RLS) – כולן עוברות, כולל `rls_test.sql` מול Postgres מקומי | ✅ |
| 32 | החלת המיגרציה ב-Supabase | 🧑 |

## פעולות שנדרשות מהמשתמש (בסוף)

1. **מסד הנתונים** – Supabase → SQL Editor → להדביק ולהריץ (לפי הסדר, מה שעוד לא הוחל):
   `supabase/migrations/20261111150000_own_auth_anonymous_public.sql`,
   `supabase/migrations/20261111180000_achievements.sql` (מסך ההישגים),
   `supabase/migrations/20261111190000_action_items.sql` (Action items).
   אחר כך להריץ את `supabase/tests/rls_test.sql` → צפוי `ALL RLS TESTS PASSED`.
2. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID → Web application:
   - Authorized JavaScript origins: `https://mirror-six-gray.vercel.app`, `http://localhost:3000`
   - Authorized redirect URIs: `https://mirror-six-gray.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
   - OAuth consent screen: שם "Mirror", לוגו, scopes `openid email profile`.
3. **Supabase** → Project Settings → JWT Keys → להעתיק את ה-Legacy JWT secret.
4. **Vercel** → mirror → Settings → Environment Variables (Production + Preview, סוג Sensitive):
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_JWT_SECRET` → ואז Redeploy.
5. **(אופציונלי)** Production Branch ב-Vercel – כרגע `ccr-54611ef2-h8fn1r`; לעדכן אם ממזגים ל-`main`.
