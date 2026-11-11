export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="טוען">
      <div className="h-8 w-1/3 rounded-lg bg-border" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-border/70" />
      ))}
    </div>
  );
}
