import type { Context, Next } from "hono";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../config/env.js";

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

export interface AuthUser {
  authId: string;
  userId: number;
  email: string;
  role: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !authUser) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("auth_id", authUser.id)
    .single();

  if (!profile) {
    return c.json({ error: "User profile not found" }, 401);
  }

  c.set("authUser", {
    authId: authUser.id,
    userId: profile.id,
    email: profile.email,
    role: profile.role,
  } satisfies AuthUser);

  await next();
}

export async function adminOnly(c: Context, next: Next) {
  const user = c.get("authUser") as AuthUser | undefined;
  if (!user || user.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
}
