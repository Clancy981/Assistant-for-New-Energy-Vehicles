import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

function normalizeDatabaseUrl(connectionString: string) {
  try {
    const url = new URL(connectionString);
    if (url.hostname.endsWith(".supabase.co") && url.port === "5432") {
      url.port = "6543";
      return url.toString();
    }
  } catch {
    return connectionString;
  }

  return connectionString;
}

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const isSupabase = databaseUrl.includes(".supabase.co");
const client = postgres(databaseUrl, {
  connect_timeout: 10,
  idle_timeout: 20,
  max: 10,
  ssl: isSupabase ? "require" : undefined,
});

export const db = drizzle(client, { schema });
