import { getOptionalUser } from "@/lib/data";
import { UserMenuDropdown } from "./user-menu-dropdown";

export async function UserMenu() {
  const user = await getOptionalUser();
  if (!user) return null;
  return <UserMenuDropdown name={user.name} avatarUrl={user.avatarUrl} />;
}
