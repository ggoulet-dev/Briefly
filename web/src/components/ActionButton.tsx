export function ActionButton({
  onClick,
  loading,
  children,
  variant = "primary",
  size = "md",
}: {
  onClick: () => void;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-1.5 text-sm",
  };

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700",
    secondary:
      "border border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:bg-zinc-800",
    danger: "bg-red-600 text-white hover:bg-red-500 active:bg-red-700",
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
