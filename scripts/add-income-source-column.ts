import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

async function addIncomeSourceColumn() {
  console.log("🔧 Adding income_source_id column to transactions...\n");

  const client = postgres(DATABASE_URL as string);

  try {
    // Check if column exists
    const columns = await client`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'income_source_id'
    `;

    if (columns.length > 0) {
      console.log("✅ Column already exists!\n");
    } else {
      // Add the column
      await client`
        ALTER TABLE transactions
        ADD COLUMN income_source_id TEXT REFERENCES income_sources(id) ON DELETE SET NULL
      `;
      console.log("✅ Column added successfully!\n");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addIncomeSourceColumn();
