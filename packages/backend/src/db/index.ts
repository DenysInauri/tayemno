import { drizzle } from "drizzle-orm/postgres-js";

export function createDb(databaseUrl: string) {
  return drizzle(databaseUrl);
}

export type Database = ReturnType<typeof createDb>;
