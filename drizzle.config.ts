import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local first, then .env
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema",
  dialect: "postgresql",
  extensionsFilters: [
    // "postgis", // Uncomment if you need postgis
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
