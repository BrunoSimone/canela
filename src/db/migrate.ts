import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Sql } from "postgres";
import { createDatabaseClient } from "./client";

const migrationsDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

type Migration = {
  name: string;
  checksum: string;
  sql: string;
};

async function loadMigrations(): Promise<Migration[]> {
  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  return Promise.all(
    filenames.map(async (name) => {
      const sql = await readFile(join(migrationsDirectory, name), "utf8");
      return {
        name,
        checksum: createHash("sha256").update(sql).digest("hex"),
        sql,
      };
    }),
  );
}

export async function runMigrations(sql: Sql): Promise<void> {
  const migrations = await loadMigrations();

  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(49190201)`;
    await transaction`
      CREATE TABLE IF NOT EXISTS schema_migration (
        name text PRIMARY KEY,
        checksum char(64) NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    for (const migration of migrations) {

      const [applied] = await transaction<{
        checksum: string;
      }[]>`
        SELECT checksum
        FROM schema_migration
        WHERE name = ${migration.name}
        FOR UPDATE
      `;

      if (applied) {
        if (applied.checksum.trim() !== migration.checksum) {
          throw new Error(
            `Migration ${migration.name} changed after it was applied`,
          );
        }
        continue;
      }

      await transaction.unsafe(migration.sql);
      await transaction`
        INSERT INTO schema_migration (name, checksum)
        VALUES (${migration.name}, ${migration.checksum})
      `;
    }
  });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // Vercel and CI inject DATABASE_URL directly; a local file is optional.
    }
  }

  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_UNPOOLED or DATABASE_URL is required to run migrations",
    );
  }

  const sql = createDatabaseClient(connectionString);
  try {
    await runMigrations(sql);
    console.log("Database migrations are up to date.");
  } finally {
    await sql.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
