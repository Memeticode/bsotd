import assert from "node:assert/strict";
import { test } from "node:test";

import { connectionConfig } from "../../src/lib/connection-config.ts";

test("URLs are passed through", () => {
  const url = "postgresql://reader@localhost:5432/news";

  assert.deepEqual(connectionConfig(url), { connectionString: url });
});

test("keyword/value strings are mapped to pool settings", () => {
  assert.deepEqual(
    connectionConfig("host=localhost port=5433 dbname=news user=reader password=secret"),
    {
      host: "localhost",
      port: 5433,
      database: "news",
      user: "reader",
      password: "secret",
    },
  );
});

test("quoted values may contain spaces and escaped quotes", () => {
  assert.deepEqual(connectionConfig("password='it\\'s a secret'"), {
    password: "it's a secret",
  });
});

test("unsupported settings are rejected", () => {
  assert.throws(
    () => connectionConfig("host=localhost sslmode=require"),
    /Unsupported connection setting "sslmode"/,
  );
});
