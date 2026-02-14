import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

function isSupabaseHost(hostname: string) {
  return (
    hostname.endsWith(".supabase.co") ||
    hostname.endsWith(".supabase.com") ||
    hostname.includes("supabase")
  );
}

function normalizeDatabaseUrl(connectionString: string) {
  try {
    const url = new URL(connectionString);
    if (isSupabaseHost(url.hostname)) {
      if (url.port === "" || url.port === "5432") {
        url.port = "6543";
      }

      if (!url.searchParams.has("sslmode")) {
        url.searchParams.set("sslmode", "require");
      }

      return url.toString();
    }
  } catch {
    return connectionString;
  }

  return connectionString;
}

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL),
  },
  strict: true,
});
