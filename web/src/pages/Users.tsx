import { useUsers } from "../lib/hooks";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { formatDistanceToNow } from "date-fns";

export function Users() {
  const { data: users, isLoading } = useUsers();

  return (
    <div>
      <PageHeader title="Users" description="Subscribers receiving briefings" />

      {isLoading ? (
        <Spinner />
      ) : !users?.length ? (
        <EmptyState message="No users found" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Timezone</th>
                <th className="px-4 py-3 text-left font-medium">Delivery</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-200">
                      {u.name ?? "Unnamed"}
                    </p>
                    <p className="text-xs text-zinc-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${u.active ? "badge-green" : "badge-red"}`}
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{u.timezone}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {u.delivery_hour}:00
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                    {formatDistanceToNow(new Date(u.created_at), {
                      addSuffix: true,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
