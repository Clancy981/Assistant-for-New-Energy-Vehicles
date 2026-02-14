import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

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

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const isSupabase = (() => {
  try {
    return isSupabaseHost(new URL(databaseUrl).hostname);
  } catch {
    return databaseUrl.includes("supabase");
  }
})();
const client = postgres(databaseUrl, {
  connect_timeout: 10,
  idle_timeout: 20,
  max: 10,
  ssl: isSupabase ? "require" : undefined,
});

export const db = drizzle(client, { schema });
