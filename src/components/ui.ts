type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98]",
  secondary: "border border-border bg-surface text-foreground hover:bg-primary-soft hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
  ghost: "text-foreground hover:bg-primary-soft",
  danger: "bg-danger text-white hover:opacity-90 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-3.5 text-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-base text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60";

export const cardClass = "rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6";
