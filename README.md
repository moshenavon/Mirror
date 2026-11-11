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
| הזדהות | Google OAuth 2.0 ישירות מול Google Cloud (PKCE), cookie חתום משלנו, JWT קצר-מועד ל-RLS |
| אנימציות | motion, Lottie (Noto Animated Emoji), canvas-confetti |
| אירוח | Vercel |
| בדיקות | Vitest + React Testing Library, בדיקות RLS ב-SQL |

## מבנה

```
src/
  app/                      # נתיבים (App Router)
    login/                  # מסך התחברות
    auth/google/            # התחלת התחברות מול Google (PKCE)
    auth/callback/          # אימות ID Token של Google ויצירת session
    r/[token]/              # קישור ציבורי למילוי ללא הזדהות (אנונימי)
    teams/new/              # יצירת צוות
    teams/[teamId]/         # מסך דיווח (כפתורים גדולים)
      history/              # הדיווחים שלי – סינון, עריכה, מחיקה
      achievements/         # מפת הישגים – דרגות לפי כמות דיווחים
      insights/             # מסך תובנות + מצגת רטרו (+ יצירת Action Item מתוך תובנה)
      action-items/         # משימות הצוות שנוצרו מתובנות – סימון "בוצע"
      settings/             # הגדרות צוות (מנהלים)
    actions/                # Server Actions (teams/entries/fields/members/action-items)
  components/               # קומפוננטות UI (+ בדיקות *.test.tsx)
  lib/                      # לוגיקה טהורה (+ בדיקות), data layer, supabase clients
  lib/auth/                 # session (jose), Google OAuth
  proxy.ts                  # הגנה על נתיבים (Next 16 "Proxy")
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
| `SUPABASE_JWT_SECRET` | ה-Legacy JWT secret של Supabase – לחתימת JWT למסד הנתונים (סודי, שרת בלבד) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Client מ-Google Cloud Console |
| `SESSION_SECRET` | מחרוזת אקראית (32+ תווים) לחתימת cookie ההתחברות |
| `NEXT_PUBLIC_APP_TIME_ZONE` | אזור זמן לפירוש טווחי תאריכים (ברירת מחדל `Asia/Jerusalem`) |
| `NEXT_PUBLIC_SITE_URL` | (אופציונלי) כתובת האתר הקנונית |

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

### הגדרות חד-פעמיות

1. **Google Cloud Console** → APIs & Services → Credentials → *Create OAuth client ID* → *Web application*:
   - Authorized JavaScript origins: `https://mirror-six-gray.vercel.app`, `http://localhost:3000`
   - Authorized redirect URIs: `https://mirror-six-gray.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
   - (OAuth consent screen: שם האפליקציה Mirror + הלוגו, scopes: `openid email profile`)
2. **Supabase** → Project Settings → JWT Keys → להעתיק את ה-*Legacy JWT secret* למשתנה `SUPABASE_JWT_SECRET` ב-Vercel.
3. **Vercel** → Settings → Environment Variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPABASE_JWT_SECRET`
   (`SESSION_SECRET` כבר מוגדר), ואז Redeploy.
4. **מסד הנתונים** – להריץ ב-SQL Editor את המיגרציות שב-`supabase/migrations/` שעוד לא הוחלו
   (הראשונה כבר הוחלה), ואחר כך את `supabase/tests/rls_test.sql` לבדיקה.

## קרדיטים

אימוג'י מונפשים: [Noto Emoji Animation](https://googlefonts.github.io/noto-emoji-animation/) של Google, רישיון CC BY 4.0.
