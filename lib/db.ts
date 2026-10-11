import pg from "pg";
import type { Pool as PoolType } from "pg";

const { Pool } = pg;

const globalForDb = globalThis as unknown as {
  smapPool?: PoolType;
};

const connectionString = process.env.DATABASE_URL;

export const db =
  globalForDb.smapPool ??
  new Pool(
    connectionString
      ? {
          connectionString,
          max: 10,
          idleTimeoutMillis: 30_000,
        }
      : {
          max: 10,
          idleTimeoutMillis: 30_000,
        }
  );

if (process.env.NODE_ENV !== "production") {
  globalForDb.smapPool = db;
}