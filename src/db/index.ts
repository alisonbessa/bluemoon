import { drizzle } from "drizzle-orm/postgres-js";

// Use a placeholder URL during build to avoid crash when DATABASE_URL is not set
export const db = drizzle(process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder");