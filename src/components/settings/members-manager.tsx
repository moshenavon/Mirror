"use client";

import { useState, useTransition } from "react";
import { addMembers, removeMember, updateMemberRole } from "@/app/actions/members";
import { isLastAdmin } from "@/lib/permissions";
import { parseEmailList } from "@/lib/emails";
import type { TeamRole } from "@/lib/supabase/database.types";
import { Avatar } from "@/components/avatar";
import { buttonClass, inputClass } from "@/components/ui";

export type ManagedMember = {
  id: string;
  email: string;
  role: TeamRole;
  name: string | null;
  avatarUrl: string | null;
};

export type MemberActions = {
  add: typeof addMembers;
  updateRole: typeof updateMemberRole;
  remove: typeof removeMember;
};

const defaultActions: MemberActions = { add: addMembers, updateRole: updateMemberRole, remove: removeMember };

type Props = {
  teamId: string;
  currentEmail: string;
  members: ManagedMember[];
  actions?: MemberActions;
};

export function MembersManager({ teamId, currentEmail, members, actions = defaultActions }: Props) {
  const [input, setInput] = useState("");
  const [role, setRole] = useState<TeamRole>("member");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = parseEmailList(input);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await actions.add(teamId, input, role);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      const { added, skipped, invalid } = result.data;
      const parts = [];
      if (added.length) parts.push(`נוספו ${added.length}`);
      if (skipped.length) parts.push(`${skipped.length} כבר בצוות`);
      if (invalid.length) parts.push(`לא תקינות: ${invalid.join(", ")}`);
      setMessage({ kind: invalid.length ? "error" : "ok", text: parts.join(" · ") });
      setInput(invalid.join(" "));
    });
  }

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setMessage({ kind: "error", text: result.error ?? "אירעה שגיאה" });
    });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={add} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block font-medium">הוספת חברים</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            dir="ltr"
            placeholder="name@gmail.com, other@company.com"
            className={`${inputClass} text-left`}
          />
          <span className="mt-1 block text-sm text-muted">אפשר להדביק כמה כתובות – מופרדות בפסיק, רווח או שורה חדשה.</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            aria-label="תפקיד לחברים החדשים"
            className={`${inputClass} w-auto`}
          >
            <option value="member">חבר צוות</option>
            <option value="admin">מנהל</option>
          </select>
          <button type="submit" disabled={pending || preview.valid.length === 0} className={buttonClass("primary", "md")}>
            {pending ? "מוסיף…" : preview.valid.length > 1 ? `הוספת ${preview.valid.length} חברים` : "הוספה"}
          </button>
        </div>
      </form>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-2 ${message.kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}`}
        >
          {message.text}
        </p>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border">
        {members.map((member) => {
          const displayName = member.name || member.email.split("@")[0];
          const lastAdmin = isLastAdmin(members, member.id);
          const isMe = member.email === currentEmail;
          return (
            <li key={member.id} className="flex flex-wrap items-center gap-3 p-3">
              <Avatar name={displayName} src={member.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {member.name ?? <span className="text-muted">טרם התחבר/ה</span>}
                  {isMe && <span className="ms-2 text-sm text-muted">(את/ה)</span>}
                </div>
                <bdi className="block truncate text-sm text-muted" dir="ltr">
                  {member.email}
                </bdi>
              </div>
              <select
                value={member.role}
                disabled={pending || lastAdmin}
                aria-label={`תפקיד של ${member.email}`}
                title={lastAdmin ? "בצוות חייב להישאר לפחות מנהל אחד" : undefined}
                onChange={(e) => run(() => actions.updateRole(member.id, e.target.value))}
                className={`${inputClass} w-auto py-1.5 text-sm`}
              >
                <option value="member">חבר צוות</option>
                <option value="admin">מנהל</option>
              </select>
              <button
                type="button"
                disabled={pending || lastAdmin}
                title={lastAdmin ? "בצוות חייב להישאר לפחות מנהל אחד" : undefined}
                aria-label={`הסרת ${member.email}`}
                onClick={() => {
                  const text = isMe ? "להסיר את עצמך מהצוות? תאבד/י גישה אליו." : `להסיר את ${member.email} מהצוות?`;
                  if (window.confirm(text)) run(() => actions.remove(member.id));
                }}
                className={buttonClass("ghost", "sm", "text-danger")}
              >
                הסרה
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
