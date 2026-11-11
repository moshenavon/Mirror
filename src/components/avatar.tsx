import { initials } from "@/lib/insights";

type Props = {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
};

const COLORS = ["#5b4cdb", "#d9467a", "#1f9d63", "#e08a1e", "#2a83c6", "#8e44ad", "#c0392b"];

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, src, size = 40, className = "" }: Props) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Google avatars, no optimisation needed
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
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
