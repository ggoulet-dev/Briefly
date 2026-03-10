const STATUS_STYLES: Record<string, string> = {
  pending: "badge badge-yellow",
  processing: "badge badge-blue",
  completed: "badge badge-green",
  failed: "badge badge-red",
  compiled: "badge badge-blue",
  sending: "badge badge-purple",
  sent: "badge badge-green",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={STATUS_STYLES[status] ?? "badge badge-zinc"}>
      {status}
    </span>
  );
}
