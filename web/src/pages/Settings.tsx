import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { useToast } from "../components/Toast";

const TIMEZONES = ["UTC", ...Intl.supportedValuesOf("timeZone")];
const TIMEZONE_SET = new Set(TIMEZONES);

function formatHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:00 ${ampm}`;
}

export function Settings() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [deliveryHour, setDeliveryHour] = useState(6);
  const [loaded, setLoaded] = useState(false);

  const isValidTimezone = TIMEZONE_SET.has(timezone);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("name, timezone, delivery_hour")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.name ?? "");
          setTimezone(data.timezone ?? "UTC");
          setDeliveryHour(data.delivery_hour ?? 6);
        }
        setLoaded(true);
      });
  }, [user]);

  const save = useMutation({
    mutationFn: async () => {
      if (!isValidTimezone) {
        throw new Error("Invalid timezone. Please select one from the list.");
      }
      const { error } = await supabase
        .from("users")
        .update({
          name: name.trim() || null,
          timezone,
          delivery_hour: deliveryHour,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refreshProfile();
      toast("Settings saved", "success");
    },
    onError: (e) => toast(e.message, "error"),
  });

  if (!loaded) return <Spinner />;

  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile and preferences" />

      <div className="card max-w-lg">
        <div className="space-y-4">
          {/* Email (read-only) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Email
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/30 px-3 py-2 text-sm text-zinc-500 outline-none cursor-not-allowed"
            />
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Timezone
            </label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              list="tz-list"
              className={`w-full rounded-lg border px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-1 ${
                timezone && !isValidTimezone
                  ? "border-red-500/50 bg-zinc-800/50 focus:border-red-500 focus:ring-red-500"
                  : "border-zinc-700 bg-zinc-800/50 focus:border-blue-500 focus:ring-blue-500"
              }`}
              placeholder="e.g. America/New_York"
            />
            <datalist id="tz-list">
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} />
              ))}
            </datalist>
            {timezone && !isValidTimezone && (
              <p className="mt-1 text-xs text-red-400">
                Invalid timezone. Pick one from the suggestions.
              </p>
            )}
          </div>

          {/* Delivery Hour */}
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Delivery Hour
            </label>
            <select
              value={deliveryHour}
              onChange={(e) => setDeliveryHour(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {formatHour(i)}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || !isValidTimezone}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {save.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
