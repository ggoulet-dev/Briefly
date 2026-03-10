import { useAuth } from "../lib/AuthContext";
import type { Page } from "../App";

interface NavItem {
  page: Page;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { page: "dashboard", label: "Dashboard", icon: "\u25E9", adminOnly: true },
  { page: "articles", label: "Articles", icon: "\u25EB" },
  { page: "briefings", label: "Briefings", icon: "\u25A4", adminOnly: true },
  { page: "sources", label: "Sources", icon: "\u25CE", adminOnly: true },
  { page: "topics", label: "Topics", icon: "\u25C8", adminOnly: true },
  { page: "users", label: "Users", icon: "\u25C9", adminOnly: true },
  { page: "my-briefings", label: "My Briefings", icon: "\u25A4" },
  { page: "my-topics", label: "My Topics", icon: "\u25C8" },
];

export function Sidebar({
  current,
  onNavigate,
}: {
  current: Page;
  onNavigate: (p: Page) => void;
}) {
  const { user, isAdmin, signOut } = useAuth();

  const visibleNav = NAV.filter((item) => {
    if (isAdmin) {
      // Admin sees admin pages, not "my-" pages
      return !item.page.startsWith("my-");
    }
    // Regular user sees non-admin pages
    return !item.adminOnly;
  });

  return (
    <aside className="hidden w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:flex lg:flex-col">
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500 text-sm font-bold text-white">
          B
        </div>
        <span className="text-sm font-semibold tracking-tight">Briefly</span>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {visibleNav.map(({ page, label, icon }) => (
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
        <p className="mb-2 truncate text-xs text-zinc-400">
          {user?.email}
        </p>
        {isAdmin && (
          <p className="mb-2 text-[10px] uppercase tracking-widest text-blue-400">
            Admin
          </p>
        )}
        <button
          onClick={signOut}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
