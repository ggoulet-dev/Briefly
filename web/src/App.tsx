import { useState } from "react";
import { useAuth } from "./lib/AuthContext";
import { Login } from "./pages/Login";
import { Spinner } from "./components/Spinner";
import { Dashboard } from "./pages/Dashboard";
import { Articles } from "./pages/Articles";
import { Sources } from "./pages/Sources";
import { Topics } from "./pages/Topics";
import { Users } from "./pages/Users";
import { Briefings } from "./pages/Briefings";
import { MyBriefings } from "./pages/MyBriefings";
import { MyTopics } from "./pages/MyTopics";
import { Home } from "./pages/Home";
import { MySources } from "./pages/MySources";
import { Settings } from "./pages/Settings";
import { Sidebar } from "./components/Sidebar";

export type Page =
  | "dashboard"
  | "articles"
  | "sources"
  | "topics"
  | "users"
  | "briefings"
  | "my-briefings"
  | "my-topics"
  | "home"
  | "my-sources"
  | "settings";

export function App() {
  const { session, isAdmin, isLoading } = useAuth();
  const [page, setPage] = useState<Page>(isAdmin ? "dashboard" : "home");

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar current={page} onNavigate={setPage} />
      <main className="flex-1 overflow-y-auto p-6 pt-20 lg:p-8 lg:pt-8">
        {page === "dashboard" && <Dashboard />}
        {page === "articles" && <Articles />}
        {page === "sources" && <Sources />}
        {page === "topics" && <Topics />}
        {page === "users" && <Users />}
        {page === "briefings" && <Briefings />}
        {page === "home" && <Home />}
        {page === "my-briefings" && <MyBriefings onNavigate={(p) => setPage(p as Page)} />}
        {page === "my-topics" && <MyTopics />}
        {page === "my-sources" && <MySources />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
