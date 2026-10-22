import pg from "pg";

import { connectionConfig } from "./connection-config";

// Keep DATE columns as "YYYY-MM-DD" strings instead of local-midnight Dates.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

const globalForPool = globalThis as typeof globalThis & { newsPool?: pg.Pool };

/**
 * The app's connection pool, reused across hot reloads in development.
 * Sessions are read-only: the app only ever reads pipeline data.
 */
export function getPool(): pg.Pool {
  if (globalForPool.newsPool === undefined) {
    const connectionString = process.env.NEWS_POSTGRES_CONNECTION_STRING;

    if (!connectionString) {
      throw new Error("NEWS_POSTGRES_CONNECTION_STRING is not set.");
    }

    globalForPool.newsPool = new pg.Pool({
      ...connectionConfig(connectionString),
      max: 4,
      options: "-c default_transaction_read_only=on -c statement_timeout=10000",
    });
  }

  return globalForPool.newsPool;
}
