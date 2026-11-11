import { initials } from "@/lib/insights";

type Props = {
  name: string;
  src?: string | null;
  /** Pixels, or any CSS length without `em` (e.g. "calc(var(--name-size) * 1.3)"). */
  size?: number | string;
  className?: string;
};

const COLORS = ["#050038", "#3d2fb3", "#d9467a", "#12805c", "#e0671e", "#2a83c6", "#8e44ad"];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, src, size = 40, className = "" }: Props) {
  const style =
    typeof size === "number"
      ? { width: size, height: size, fontSize: Math.round(size * 0.38) }
      : { width: size, height: size, fontSize: `calc(${size} * 0.38)` };
  const pixels = typeof size === "number" ? size : undefined;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Google avatars, no optimisation needed
      <img
        src={src}
        alt={name}
        width={pixels}
        height={pixels}
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={style}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ ...style, backgroundColor: colorFor(name) }}
    >
      {initials(name)}
    </span>
  );
}
