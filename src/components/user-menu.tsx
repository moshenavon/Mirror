import Link from "next/link";
import { getOptionalUser } from "@/lib/data";
import { signOut } from "@/app/actions/auth";
import { Avatar } from "./avatar";
import { buttonClass } from "./ui";

export async function UserMenu() {
  const user = await getOptionalUser();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Link href="/" className={buttonClass("ghost", "sm")}>
        <span aria-hidden>👥</span> הצוותים שלי
      </Link>
      <Avatar name={user.name} src={user.avatarUrl} size={34} />
      <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
      <form action={signOut}>
        <button type="submit" className={buttonClass("ghost", "sm")}>
          יציאה
        </button>
      </form>
    </div>
  );
}
