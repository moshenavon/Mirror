import { describe, expect, it } from "vitest";
import {
  LEVELS,
  buildStations,
  levelFor,
  nextGoalText,
  progressFor,
  thresholdLabel,
  toPlayer,
  trailPath,
  type Player,
} from "./achievements";

const player = (name: string, count: number, isMe = false): Player => ({
  email: `${name}@x.com`,
  name,
  avatarUrl: null,
  count,
  isMe,
});

describe("levels", () => {
  it("uses the 0 / 10 / 20 / 50 / 100 ladder from the start upwards", () => {
    expect(LEVELS.map((l) => l.threshold)).toEqual([0, 10, 20, 50, 100]);
    expect(LEVELS.map((l) => l.index)).toEqual([0, 1, 2, 3, 4]);
    expect(LEVELS.at(-1)?.title).toBe("מלך הדיווחים");
  });

  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [19, 1],
    [20, 2],
    [49, 2],
    [50, 3],
    [99, 3],
    [100, 4],
    [5000, 4],
  ])("%i entries → level %i", (count, index) => {
    expect(levelFor(count).index).toBe(index);
  });
});

describe("progressFor", () => {
  it("measures progress inside the current band", () => {
    expect(progressFor(0)).toMatchObject({ remaining: 10, ratio: 0 });
    expect(progressFor(15)).toMatchObject({ remaining: 5, ratio: 0.5 });
    expect(progressFor(35).level.index).toBe(2);
    expect(progressFor(35)).toMatchObject({ remaining: 15, ratio: 0.5 });
    expect(progressFor(15).next?.index).toBe(2);
  });

  it("is full at the top", () => {
    expect(progressFor(150)).toMatchObject({ next: null, remaining: 0, ratio: 1 });
  });

  it("ignores negative / fractional counts", () => {
    expect(progressFor(-3)).toMatchObject({ remaining: 10, ratio: 0 });
    expect(progressFor(9.8).level.index).toBe(0);
  });
});

describe("nextGoalText", () => {
  it("encourages the first entry", () => {
    expect(nextGoalText(progressFor(0), 0)).toContain("הדיווח הראשון");
    expect(nextGoalText(progressFor(0), 0)).toContain("עוד 10 דיווחים לגוזל המשוב");
  });
  it("uses the singular for one missing entry", () => {
    expect(nextGoalText(progressFor(19), 19)).toBe("עוד דיווח אחד לבלש התובנות 🕵️");
  });
  it("celebrates the top", () => {
    expect(nextGoalText(progressFor(100), 100)).toContain("הגעת לפסגה");
  });
});

describe("buildStations", () => {
  it("puts every player at their level, ranked by count", () => {
    const stations = buildStations([player("a", 3), player("b", 12), player("c", 9), player("d", 120), player("e", 15)]);
    expect(stations).toHaveLength(LEVELS.length);
    expect(stations[0].players.map((p) => p.name)).toEqual(["c", "a"]);
    expect(stations[1].players.map((p) => p.name)).toEqual(["e", "b"]);
    expect(stations[2].players).toEqual([]);
    expect(stations[4].players.map((p) => p.name)).toEqual(["d"]);
  });
});

describe("toPlayer", () => {
  it("falls back to the e-mail name for members who never signed in", () => {
    expect(
      toPlayer({ member_email: "dana@x.com", full_name: null, avatar_url: null, entry_count: 0, is_me: false }),
    ).toEqual({ email: "dana@x.com", name: "dana", avatarUrl: null, count: 0, isMe: false });
  });
});

describe("thresholdLabel", () => {
  it("labels the start and the thresholds", () => {
    expect(thresholdLabel(LEVELS[0])).toBe("נקודת ההתחלה");
    expect(thresholdLabel(LEVELS[3])).toBe("50 דיווחים");
  });
});

describe("trailPath", () => {
  it("is empty for fewer than two nodes", () => {
    expect(trailPath([], [])).toBe("");
    expect(trailPath([{ x: 10, y: 10 }], [])).toBe("");
  });

  it("goes up, crosses sideways at the gap and continues up", () => {
    const d = trailPath(
      [
        { x: 300, y: 500 },
        { x: 50, y: 300 },
      ],
      [400],
      20,
    );
    expect(d).toBe("M 300 500 L 300 420 Q 300 400 280 400 L 70 400 Q 50 400 50 380 L 50 300");
  });

  it("draws a straight line between nodes on the same column", () => {
    expect(
      trailPath(
        [
          { x: 50, y: 500 },
          { x: 50, y: 300 },
        ],
        [400],
      ),
    ).toBe("M 50 500 L 50 300");
  });
});
