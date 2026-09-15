import postgres, { type Sql } from "postgres";

let database: Sql | undefined;

export function createDatabaseClient(connectionString: string): Sql {
  return postgres(connectionString, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

export function getDatabase(): Sql {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for server-side database access");
  }

  database ??= createDatabaseClient(connectionString);
  return database;
}
