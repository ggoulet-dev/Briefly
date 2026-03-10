type Page = "dashboard" | "articles" | "sources" | "topics" | "users" | "briefings";

const NAV: { page: Page; label: string; icon: string }[] = [
  { page: "dashboard", label: "Dashboard", icon: "◩" },
  { page: "articles", label: "Articles", icon: "◫" },
  { page: "briefings", label: "Briefings", icon: "▤" },
  { page: "sources", label: "Sources", icon: "◎" },
  { page: "topics", label: "Topics", icon: "◈" },
  { page: "users", label: "Users", icon: "◉" },
];

export function Sidebar({
  current,
  onNavigate,
}: {
  current: Page;
  onNavigate: (p: Page) => void;
}) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500 text-sm font-bold text-white">
          B
        </div>
        <span className="text-sm font-semibold tracking-tight">Briefly</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map(({ page, label, icon }) => (
          <button
            key={page}
            onClick={() => onNavigate(page)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              current === page
                ? "bg-zinc-800/80 text-white"
                : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="border-t border-zinc-800 p-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">
          AI News Platform
        </p>
      </div>
    </aside>
  );
}
