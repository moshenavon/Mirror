"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  buildStations,
  nextGoalText,
  progressFor,
  thresholdLabel,
  trailPath,
  type Level,
  type Player,
  type Point,
} from "@/lib/achievements";
import { entriesLabel } from "@/lib/insights";
import { finale } from "@/lib/confetti";
import { Avatar } from "./avatar";
import { Emoji } from "./emoji";
import { buttonClass, cardClass } from "./ui";

type Props = {
  teamId: string;
  players: Player[];
};

const levelStorageKey = (teamId: string) => `mirror:achievement-level:${teamId}`;

export function AchievementsMap({ teamId, players }: Props) {
  const stations = useMemo(() => buildStations(players), [players]);
  const me = players.find((p) => p.isMe) ?? null;
  const myLevel = me ? progressFor(me.count).level.index : -1;
  const teamTotal = players.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {me && <MyProgress teamId={teamId} me={me} teamTotal={teamTotal} />}

      <section aria-labelledby="achievements-map-title">
        <h2 id="achievements-map-title" className="mb-1 text-xl font-semibold">
          מפת ההישגים
        </h2>
        <p className="mb-6 text-sm text-muted">כל דיווח מקדם אתכם במעלה המפה. מי יגיע ראשון לכתר?</p>
        <LevelsTrail stations={stations} myLevel={myLevel} />
      </section>

      <p className="text-center text-sm text-muted">
        🤫 דיווחים אנונימיים לא נספרים. הם באמת אנונימיים, אפילו לנו אין מושג מי שלח אותם.
      </p>
    </div>
  );
}

function MyProgress({ teamId, me, teamTotal }: { teamId: string; me: Player; teamTotal: number }) {
  const progress = progressFor(me.count);
  const percent = Math.round(progress.ratio * 100);
  const [levelUp, setLevelUp] = useState<Level | null>(null);
  // Level stored before this visit; read once so re-running effects (Strict Mode) do not lose it.
  const seenRef = useRef<number | null>(null);

  // Celebrate once whenever the member reached a level they had not seen yet (per browser).
  useEffect(() => {
    const key = levelStorageKey(teamId);
    if (seenRef.current === null) {
      try {
        seenRef.current = Number(localStorage.getItem(key) ?? 0) || 0;
      } catch {
        seenRef.current = 0; // storage unavailable – just show the map
      }
    }
    const seen = seenRef.current;
    try {
      localStorage.setItem(key, String(progress.level.index));
    } catch {
      /* ignore */
    }
    if (progress.level.index <= seen) return;
    const timer = setTimeout(() => {
      setLevelUp(progress.level);
      void finale();
    }, 600);
    return () => clearTimeout(timer);
  }, [teamId, progress.level]);

  return (
    <section aria-label="ההתקדמות שלי" className={`${cardClass} relative animate-fade-up overflow-hidden`}>
      <span
        aria-hidden
        className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-accent/25 blur-3xl"
      />
      <AnimatePresence>
        {levelUp && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative mb-4 rounded-xl bg-accent px-4 py-2 text-center text-lg font-bold text-on-accent"
          >
            🎉 עלית דרגה! ברוכים הבאים ל{levelUp.title} {levelUp.emoji}
          </motion.p>
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-4">
        <Emoji value={progress.level.emoji} size={72} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">הדרגה שלי</p>
          <p className="text-2xl font-extrabold sm:text-3xl">{progress.level.title}</p>
          <p className="text-sm font-medium">{entriesLabel(me.count)} עד עכשיו</p>
        </div>
      </div>

      <div className="relative mt-5">
        <div
          role="progressbar"
          aria-label={progress.next ? `ההתקדמות ל${progress.next.title}` : "הגעת לפסגה"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-3.5 overflow-hidden rounded-full bg-border"
        >
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          />
        </div>
        <p className="mt-2 font-semibold">{nextGoalText(progress, me.count)}</p>
      </div>

      <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/teams/${teamId}`} className={buttonClass("primary", "md")}>
          ✍️ לדווח עכשיו
        </Link>
        <p className="text-sm text-muted">ביחד הצוות כבר שלח {entriesLabel(teamTotal)}</p>
      </div>
    </section>
  );
}

type Geometry = { width: number; height: number; nodes: Point[]; gaps: number[] };

function LevelsTrail({ stations, myLevel }: { stations: ReturnType<typeof buildStations>; myLevel: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLElement | null)[]>([]);
  const rowRefs = useRef<(HTMLElement | null)[]>([]);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  // The trail is drawn behind the stations, through the centre of each level node.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const box = container.getBoundingClientRect();
      const nodes: Point[] = [];
      const gaps: number[] = [];
      stations.forEach((_, i) => {
        const node = nodeRefs.current[i]?.getBoundingClientRect();
        if (node) nodes.push({ x: node.left + node.width / 2 - box.left, y: node.top + node.height / 2 - box.top });
        const lower = rowRefs.current[i]?.getBoundingClientRect();
        const upper = rowRefs.current[i + 1]?.getBoundingClientRect();
        if (lower && upper) gaps.push((upper.bottom + lower.top) / 2 - box.top);
      });
      setGeometry({ width: box.width, height: box.height, nodes, gaps });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [stations]);

  const fullPath = geometry ? trailPath(geometry.nodes, geometry.gaps) : "";
  const reachedPath =
    geometry && myLevel > 0 ? trailPath(geometry.nodes.slice(0, myLevel + 1), geometry.gaps.slice(0, myLevel)) : "";

  return (
    <div ref={containerRef} className="relative">
      {geometry && fullPath && (
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          width={geometry.width}
          height={geometry.height}
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        >
          <path d={fullPath} fill="none" stroke="var(--border)" strokeWidth={14} strokeLinecap="round" />
          <path
            d={fullPath}
            fill="none"
            stroke="var(--muted)"
            strokeOpacity={0.45}
            strokeWidth={2.5}
            strokeDasharray="2 12"
            strokeLinecap="round"
          />
          {reachedPath && (
            <motion.path
              d={reachedPath}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={14}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, delay: 0.3, ease: "easeInOut" }}
            />
          )}
        </svg>
      )}

      {/* Rendered top (highest level) to bottom (starting point). */}
      <ol aria-label="דרגות" className="relative flex flex-col-reverse gap-8 sm:gap-10">
        {stations.map(({ level, players }) => {
          const reached = level.index <= myLevel;
          const isMine = level.index === myLevel;
          const flip = level.index % 2 === 1;
          return (
            <li
              key={level.index}
              ref={(el) => {
                rowRefs.current[level.index] = el;
              }}
              aria-label={`${level.title} – ${thresholdLabel(level)}`}
              aria-current={isMine ? "step" : undefined}
              className={`flex items-center gap-3 sm:gap-6 ${flip ? "flex-row-reverse" : ""}`}
            >
              <div className="flex w-20 shrink-0 justify-center sm:w-28">
                <motion.div
                  ref={(el) => {
                    nodeRefs.current[level.index] = el;
                  }}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + level.index * 0.08, type: "spring", stiffness: 260, damping: 18 }}
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 shadow-md sm:h-24 sm:w-24 ${
                    reached ? "border-accent bg-primary-soft" : "border-border bg-surface grayscale-[60%]"
                  } ${isMine ? "ring-4 ring-accent/40 ring-offset-2 ring-offset-background" : ""}`}
                >
                  <Emoji value={level.emoji} size={52} playing={isMine || level.index === stations.length - 1} />
                </motion.div>
              </div>

              <div
                className={`min-w-0 flex-1 rounded-2xl border bg-surface p-4 shadow-sm sm:p-5 ${
                  isMine ? "border-accent" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <h3 className="text-lg font-bold sm:text-xl">{level.title}</h3>
                  <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold">
                    {thresholdLabel(level)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{level.tagline}</p>

                {players.length > 0 ? (
                  <ul aria-label={`משתתפים ב${level.title}`} className="mt-3 flex flex-wrap gap-x-2 gap-y-3">
                    {players.map((player, i) => (
                      <PlayerToken key={player.email} player={player} level={level} order={i} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted">
                    {level.emptyText}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PlayerToken({ player, level, order }: { player: Player; level: Level; order: number }) {
  const progress = progressFor(player.count);
  const percent = Math.round(progress.ratio * 100);
  const firstName = player.name.split(/\s+/)[0] || player.name;
  const label = `${player.name} · ${entriesLabel(player.count)}`;

  return (
    <motion.li
      // Everyone climbs up from the starting point to their level.
      initial={{ opacity: 0, y: 40 + level.index * 70 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + level.index * 0.15 + order * 0.05, type: "spring", stiffness: 110, damping: 15 }}
      title={label}
      className="flex w-16 flex-col items-center gap-1"
    >
      <span
        className={`relative rounded-full p-[3px] ${player.isMe ? "scale-110" : ""}`}
        style={{ background: `conic-gradient(var(--accent) ${percent}%, var(--border) 0)` }}
      >
        <span className={`block rounded-full p-0.5 ${player.isMe ? "bg-primary" : "bg-surface"}`}>
          <Avatar name={player.name} src={player.avatarUrl} size={44} />
        </span>
        <span
          aria-hidden
          className="absolute -bottom-1 -left-1 min-w-6 rounded-full bg-primary px-1.5 text-center text-[11px] font-bold leading-5 text-on-primary"
        >
          {player.count}
        </span>
      </span>
      <span className={`max-w-full truncate text-xs ${player.isMe ? "font-extrabold" : "font-medium"}`}>
        {player.isMe ? "אני" : firstName}
      </span>
      <span className="sr-only">{label}</span>
    </motion.li>
  );
}
