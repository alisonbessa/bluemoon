import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder",
});

export const db = drizzle({ client: pool });
