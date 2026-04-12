import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (DB_HOST && DB_USER && DB_PASSWORD && DB_NAME) {
    return `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}/${DB_NAME}`;
  }

  throw new Error(
    "Database connection not configured. Set DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, DB_NAME."
  );
}

const connectionString = getDatabaseUrl();

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require") || process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema });
