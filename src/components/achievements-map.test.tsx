import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AchievementsMap } from "./achievements-map";
import type { Player } from "@/lib/achievements";

const players: Player[] = [
  { email: "me@x.com", name: "משה כהן", avatarUrl: null, count: 15, isMe: true },
  { email: "dana@x.com", name: "דנה לוי", avatarUrl: null, count: 120, isMe: false },
  { email: "yossi@x.com", name: "yossi", avatarUrl: null, count: 0, isMe: false },
];

describe("AchievementsMap", () => {
  beforeEach(() => localStorage.clear());

  it("shows my level and what is left for the next one", () => {
    render(<AchievementsMap teamId="t1" players={players} />);
    const mine = screen.getByRole("region", { name: "ההתקדמות שלי" });
    expect(within(mine).getByText("גוזל המשוב")).toBeInTheDocument();
    expect(within(mine).getByText("15 דיווחים עד עכשיו")).toBeInTheDocument();
    expect(within(mine).getByText("עוד 10 דיווחים לבלש התובנות 🕵️")).toBeInTheDocument();
    expect(within(mine).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    expect(within(mine).getByRole("link", { name: /לדווח עכשיו/ })).toHaveAttribute("href", "/teams/t1");
    expect(within(mine).getByText(/135 דיווחים/)).toBeInTheDocument();
  });

  it("places every member at the station that matches their entries", () => {
    render(<AchievementsMap teamId="t1" players={players} />);
    const stations = within(screen.getByRole("list", { name: "דרגות" })).getAllByRole("listitem", {
      name: /–/,
    });
    // starting point first (rendered at the bottom of the map)
    expect(stations.map((s) => s.getAttribute("aria-label"))).toEqual([
      "ביצת הזינוק – נקודת ההתחלה",
      "גוזל המשוב – 10 דיווחים",
      "בלש התובנות – 25 דיווחים",
      "טייס הרטרו – 50 דיווחים",
      "מלך הדיווחים – 100 דיווחים",
      "אגדת הרטרו – 200 דיווחים",
    ]);
    expect(within(stations[0]).getByText("yossi · 0 דיווחים")).toBeInTheDocument();
    expect(within(stations[1]).getByText("משה כהן · 15 דיווחים")).toBeInTheDocument();
    expect(within(stations[1]).getByText("אני")).toBeInTheDocument();
    expect(stations[1]).toHaveAttribute("aria-current", "step");
    expect(within(stations[2]).getByText("התיק עדיין פתוח. דרוש בלש.")).toBeInTheDocument();
    expect(within(stations[4]).getByText("דנה")).toBeInTheDocument();
  });

  it("celebrates a level the member had not seen before, once", async () => {
    const { unmount } = render(<AchievementsMap teamId="t1" players={players} />);
    expect(await screen.findByRole("status", {}, { timeout: 2000 })).toHaveTextContent("עלית דרגה!");
    expect(localStorage.getItem("mirror:achievement-level:t1")).toBe("1");
    unmount();

    render(<AchievementsMap teamId="t1" players={players} />);
    await new Promise((r) => setTimeout(r, 800));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not celebrate at the starting point", async () => {
    render(<AchievementsMap teamId="t1" players={[{ ...players[0], count: 0 }]} />);
    expect(screen.getByText(/הדיווח הראשון הוא הכי קשה/)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 800));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
