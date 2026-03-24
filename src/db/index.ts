import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder",
  // Connection pool tuning for serverless environments
  max: 10,               // max connections (Neon free tier supports up to 10)
  idleTimeoutMillis: 20000,   // close idle connections after 20s
  connectionTimeoutMillis: 5000, // fail fast if connection takes >5s
});

export const db = drizzle({ client: pool });
