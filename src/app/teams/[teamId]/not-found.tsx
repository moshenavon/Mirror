import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function TeamNotFound() {
  return (
    <div className="py-16 text-center">
      <div className="text-5xl" aria-hidden>
        🔒
      </div>
      <h2 className="mt-4 text-2xl font-semibold">אין גישה לעמוד הזה</h2>
      <p className="mt-2 text-muted">ייתכן שהצוות לא קיים, או שהמייל שלך לא משויך אליו / אין לך הרשאה.</p>
      <Link href="/" className={buttonClass("secondary", "md", "mt-6")}>
        חזרה לצוותים שלי
      </Link>
    </div>
  );
}
