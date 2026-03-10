import { useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Articles } from "./pages/Articles";
import { Sources } from "./pages/Sources";
import { Topics } from "./pages/Topics";
import { Users } from "./pages/Users";
import { Briefings } from "./pages/Briefings";
import { Sidebar } from "./components/Sidebar";

type Page = "dashboard" | "articles" | "sources" | "topics" | "users" | "briefings";

export function App() {
  const [page, setPage] = useState<Page>("dashboard");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {page === "dashboard" && <Dashboard />}
        {page === "articles" && <Articles />}
        {page === "sources" && <Sources />}
        {page === "topics" && <Topics />}
        {page === "users" && <Users />}
        {page === "briefings" && <Briefings />}
      </main>
    </div>
  );
}
