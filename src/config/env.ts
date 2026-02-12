import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  isDev: optional("NODE_ENV", "development") === "development",

  redisUrl: optional("REDIS_URL", "redis://localhost:6379"),

  openaiApiKey: required("OPENAI_API_KEY"),
  openaiModel: optional("OPENAI_MODEL", "gpt-4o-mini"),
  openaiProject: optional("OPENAI_PROJECT", ""),

  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  discordWebhookUrl: optional("DISCORD_WEBHOOK_URL", ""),
} as const;
