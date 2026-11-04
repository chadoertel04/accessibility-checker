import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const schemaPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../init-db/01-create-accessibility-reviews.sql",
);

/**
 * Applies the review schema. The same file is executed by the Postgres
 * container on first start, so this only matters for pre-existing volumes.
 */
export async function applySchema(): Promise<void> {
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
