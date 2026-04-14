export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-2xl space-y-3"
      role="status"
      aria-live="polite"
      aria-label="Đang tải"
    >
      <div className="glass-card h-16 animate-pulse sm:h-24" />
      <div className="glass-card h-14 animate-pulse sm:h-16" />
      <div className="glass-card h-14 animate-pulse sm:h-16" />
      <div className="glass-card h-14 animate-pulse sm:h-16" />
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
