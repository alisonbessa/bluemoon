import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as schema from "../src/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function pushSchema() {
  console.log("Creating tables...");

  try {
    // Get all SQL statements from drizzle-kit
    const { execSync } = require('child_process');
    const sqlStatements = execSync('pnpm drizzle-kit generate', { encoding: 'utf-8' });

    console.log("Schema pushed successfully!");
  } catch (error) {
    console.error("Error pushing schema:", error);
    process.exit(1);
  }
}

pushSchema();
