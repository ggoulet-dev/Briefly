export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "blue" | "green" | "yellow" | "red";
}) {
  const accentColor = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    yellow: "text-amber-400",
    red: "text-red-400",
  }[accent ?? "blue"];

  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${accentColor}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
