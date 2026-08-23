import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const connectionString = process.env.SUPABASE_MIGRATION_DB_URL;
if (!connectionString) {
  throw new Error("SUPABASE_MIGRATION_DB_URL is required to apply the Supabase migration.");
}

const migrationName = process.argv[2] ?? "0001_recoverflow_control_plane.sql";
if (!/^[a-z0-9_.-]+\.sql$/i.test(migrationName)) {
  throw new Error("Migration filename must reference a local .sql file.");
}
const migrationPath = resolve("supabase/migrations", migrationName);
const migrationSql = await readFile(migrationPath, "utf8");
const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

try {
  await pool.query(migrationSql);
  console.log("RecoverFlow Supabase migration applied successfully.");
} finally {
  await pool.end();
}
