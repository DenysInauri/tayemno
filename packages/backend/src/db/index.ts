import { drizzle } from "drizzle-orm/postgres-js";

export const createDb = (databaseUrl: string) => {
  return drizzle(databaseUrl);
};

export type Database = ReturnType<typeof createDb>;
