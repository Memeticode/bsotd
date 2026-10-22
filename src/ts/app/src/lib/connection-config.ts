import type { PoolConfig } from "pg";

// libpq keywords node-postgres can use, and their names in a pool config.
const KEYWORDS: Record<string, "host" | "port" | "database" | "user" | "password"> = {
  host: "host",
  port: "port",
  dbname: "database",
  user: "user",
  password: "password",
};

/**
 * Turns a PostgreSQL connection string into pool settings. Accepts URLs
 * ("postgresql://user@host/db") and the keyword/value form that psycopg also
 * accepts ("host=localhost dbname=news"), which node-postgres can't parse.
 */
export function connectionConfig(connectionString: string): PoolConfig {
  if (/^postgres(ql)?:\/\//.test(connectionString)) {
    return { connectionString };
  }

  const config: PoolConfig = {};

  for (const [keyword, value] of parseKeywordValues(connectionString)) {
    const setting = KEYWORDS[keyword];

    if (setting === undefined) {
      throw new Error(`Unsupported connection setting "${keyword}".`);
    }

    if (setting === "port") {
      config.port = Number(value);
    } else {
      config[setting] = value;
    }
  }

  return config;
}

/** Reads keyword=value pairs; values may be single-quoted, with \' and \\ escapes. */
function parseKeywordValues(text: string): [string, string][] {
  const pairs = text.matchAll(/(\w+)\s*=\s*(?:'((?:[^'\\]|\\.)*)'|(\S*))/g);

  return [...pairs].map(([, keyword, quoted, plain]) => [
    keyword,
    quoted === undefined ? plain : quoted.replace(/\\(.)/g, "$1"),
  ]);
}
