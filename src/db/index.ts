import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Use Neon serverless driver (HTTP) for faster cold starts in serverless environments.
// HTTP mode uses stateless fetch requests — no WebSocket/TCP connection overhead.
const sql = neon(process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder");
export const db = drizzle({ client: sql });
