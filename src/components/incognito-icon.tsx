type Props = {
  /** Pixels or any CSS length. Defaults to 1em so it scales with the surrounding text. */
  size?: number | string;
  className?: string;
  /** Accessible label; when omitted the icon is decorative. */
  label?: string;
};

/** "Anonymous" mark: a detective hat over a pair of round glasses (incognito style). */
export function IncognitoIcon({ size = "1em", className = "", label }: Props) {
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };
  return (
    <svg
      {...a11y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      data-icon="incognito"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
    >
      {/* hat crown + brim */}
      <path d="M6.2 9.6 7.6 4.3c.2-.8 1-1.2 1.8-.9l1.5.6c.7.3 1.5.3 2.2 0l1.5-.6c.8-.3 1.6.1 1.8.9l1.4 5.3Z" fill="currentColor" />
      <rect x="1.5" y="9.6" width="21" height="2.2" rx="1.1" fill="currentColor" />
      {/* glasses */}
      <circle cx="7" cy="17" r="3.3" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17" cy="17" r="3.3" stroke="currentColor" strokeWidth="1.9" />
      <path d="M10.3 16.4c1.1-.8 2.3-.8 3.4 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
