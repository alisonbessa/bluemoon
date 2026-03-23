import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

// Use Neon serverless driver with WebSocket pooling.
// Supports transactions (unlike neon-http) while still being serverless-friendly.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder",
});
export const db = drizzle({ client: pool });
