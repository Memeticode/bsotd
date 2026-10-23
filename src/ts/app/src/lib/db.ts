import pg from "pg";

import { connectionConfig } from "./connection-config";

// Keep DATE columns as "YYYY-MM-DD" strings instead of local-midnight Dates.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const globalForPools = globalThis as typeof globalThis & {
  newsPool?: pg.Pool;
  editorPool?: pg.Pool;
};

/**
 * The app's connection pool for reading, reused across hot reloads in
 * development. Its sessions are read-only.
 */
export function getPool(): pg.Pool {
  globalForPools.newsPool ??= createPool(
    "-c default_transaction_read_only=on -c statement_timeout=10000",
  );

  return globalForPools.newsPool;
}

/**
 * A separate pool whose sessions can write, used only to save editors'
 * corrections, so nothing else in the app can change data by mistake.
 */
export function getEditorPool(): pg.Pool {
  globalForPools.editorPool ??= createPool("-c statement_timeout=10000");

  return globalForPools.editorPool;
}

function createPool(options: string): pg.Pool {
  const connectionString = process.env.NEWS_POSTGRES_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error("NEWS_POSTGRES_CONNECTION_STRING is not set.");
  }

  const pool = new pg.Pool({
    ...connectionConfig(connectionString),
    max: 4,
    options,
  });

  // An idle connection can drop, for example when PostgreSQL restarts. The
  // pool discards it, but without a listener the error would end the process.
  pool.on("error", (error) => {
    console.error("An idle database connection failed:", error.message);
  });

  return pool;
}
