# 🪞 Mirror

פלטפורמה לאיסוף מחשבות ותובנות של חברי צוות לאורך הזמן, והצגתן בצורה מסודרת בפגישת הרטרו.

- **אפיון מלא:** [`docs/SPEC.md`](docs/SPEC.md)
- **משימות וסטטוס:** [`docs/TASKS.md`](docs/TASKS.md)

## סטאק

| שכבה | טכנולוגיה |
|------|-----------|
| אפליקציה | Next.js 16 (App Router, Server Components, Server Actions, Cache Components) + TypeScript |
| עיצוב | Tailwind CSS 4, RTL, פונט Heebo |
| מסד נתונים | Supabase Postgres + Row Level Security |
| הזדהות | Supabase Auth – ספק Google (OAuth מ-Google Cloud) |
| אירוח | Vercel |
| בדיקות | Vitest + React Testing Library, בדיקות RLS ב-SQL |

## מבנה

```
src/
  app/                      # נתיבים (App Router)
    login/                  # מסך התחברות
    auth/callback/          # החלפת קוד OAuth ל-session
    teams/new/              # יצירת צוות
    teams/[teamId]/         # מסך דיווח (כפתורים גדולים)
      history/              # הדיווחים שלי – סינון, עריכה, מחיקה
      insights/             # מסך תובנות + מצגת רטרו
      settings/             # הגדרות צוות (מנהלים)
    actions/                # Server Actions (teams/entries/fields/members)
  components/               # קומפוננטות UI (+ בדיקות *.test.tsx)
  lib/                      # לוגיקה טהורה (+ בדיקות), data layer, supabase clients
  proxy.ts                  # רענון session והגנה על נתיבים (Next 16 "Proxy")
supabase/
  migrations/               # סכמת מסד הנתונים, RLS ו-RPC
  tests/rls_test.sql        # בדיקות הרשאות (רצות בטרנזקציה ומתגלגלות אחורה)
```

## הרצה מקומית

```bash
npm install
cp .env.example .env.local   # ולמלא את הערכים
npm run dev                  # http://localhost:3000
```

משתני סביבה:

| משתנה | תיאור |
|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת פרויקט Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | מפתח publishable (ציבורי) |
| `NEXT_PUBLIC_APP_TIME_ZONE` | אזור זמן לפירוש טווחי תאריכים (ברירת מחדל `Asia/Jerusalem`) |

## בדיקות

```bash
npm test            # unit + component tests
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run build       # build production
```

בדיקות ההרשאות במסד הנתונים: להריץ את `supabase/tests/rls_test.sql` ב-Supabase SQL Editor
(או `psql "$DATABASE_URL" -f supabase/tests/rls_test.sql`). הסקריפט רץ בטרנזקציה שמסתיימת ב-`ROLLBACK`
ומדפיס `ALL RLS TESTS PASSED`.

## הרשאות – בקצרה

- שיוך לצוות נקבע לפי **מייל מאומת** של חשבון Google, מול הטבלה `team_members`.
- כל ההרשאות נאכפות ב-Postgres (RLS + פונקציות `security definer` בסכמה `private`).
- מסך התובנות: מנהלים בלבד כברירת מחדל; מנהל יכול לפתוח לכל חברי הצוות.
- בצוות חייב להישאר תמיד מנהל אחד לפחות.

## דיפלוי

הפרויקט מחובר ל-Vercel (`mirror`) – כל push לריפו יוצר דיפלוי אוטומטי.

### הגדרות חד-פעמיות (Google + Supabase)

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* (Web application):
   - Authorized redirect URI: `https://kcpbotofdgdrwvuclwck.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Sign In / Providers → **Google**: להפעיל ולהזין Client ID + Client Secret.
3. **Supabase** → Authentication → URL Configuration:
   - Site URL: כתובת ה-production ב-Vercel.
   - Redirect URLs: `https://<production-domain>/auth/callback`, `http://localhost:3000/auth/callback`,
     ולתצוגות preview: `https://*-moshe-faa7.vercel.app/auth/callback`.
