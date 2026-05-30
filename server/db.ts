import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
let dbInitError: string | null = null;

try {
  if (!process.env.DATABASE_URL) {
    dbInitError = "DATABASE_URL is not set. Emotion metrics will not be persisted.";
  } else {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    dbInstance = drizzle(pool, { schema });
  }
} catch (error) {
  dbInitError = `Failed to initialize database: ${String(error)}`;
}

export const db = dbInstance;
export const dbError = dbInitError;
