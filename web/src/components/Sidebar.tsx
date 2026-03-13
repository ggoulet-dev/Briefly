import { useState } from "react";
import { useAuth } from "../lib/AuthContext";
import type { Page } from "../App";

interface NavItem {
  page: Page;
  label: string;
  icon: string;
  adminOnly?: boolean;
  userOnly?: boolean;
}

const NAV: NavItem[] = [
  { page: "dashboard", label: "Dashboard", icon: "\u25E9", adminOnly: true },
  { page: "articles", label: "Articles", icon: "\u25EB", adminOnly: true },
  { page: "briefings", label: "Briefings", icon: "\u25A4", adminOnly: true },
  { page: "sources", label: "Sources", icon: "\u25CE", adminOnly: true },
  { page: "topics", label: "Topics", icon: "\u25C8", adminOnly: true },
  { page: "users", label: "Users", icon: "\u25C9", adminOnly: true },
  { page: "home", label: "Home", icon: "\u2302", userOnly: true },
  { page: "my-topics", label: "My Topics", icon: "\u25C8", userOnly: true },
  { page: "my-sources", label: "My Sources", icon: "\u25CE", userOnly: true },
  { page: "my-briefings", label: "My Briefings", icon: "\u25A4", userOnly: true },
  { page: "settings", label: "Settings", icon: "\u2699", userOnly: true },
];

export function Sidebar({
  current,
  onNavigate,
}: {
  current: Page;
  onNavigate: (p: Page) => void;
}) {
  const { user, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV.filter((item) => {
    if (isAdmin) {
      return !item.userOnly;
    }
    return !item.adminOnly;
  });

  const handleNavigate = (p: Page) => {
    onNavigate(p);
    setMobileOpen(false);
  };

  const navContent = (
    <>
      <div className="flex h-14 items-center justify-between border-b border-zinc-800 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500 text-sm font-bold text-white">
            B
          </div>
          <span className="text-sm font-semibold tracking-tight">Briefly</span>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="text-zinc-400 hover:text-zinc-200 lg:hidden"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {visibleNav.map(({ page, label, icon }) => (
          <button
            key={page}
            onClick={() => handleNavigate(page)}
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
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 5h14M3 10h14M3 15h14" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-500 text-xs font-bold text-white">
            B
          </div>
          <span className="text-sm font-semibold tracking-tight">Briefly</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <aside
            className="flex h-full w-64 flex-col bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-zinc-800 bg-zinc-950 lg:flex lg:flex-col">
        {navContent}
      </aside>
    </>
  );
}
