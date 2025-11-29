import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";
import { execSync } from "child_process";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in .env.local");
  console.error("Make sure you have DATABASE_URL in your .env.local file");
  process.exit(1);
}

async function resetDatabase() {
  console.log("🗑️  Starting database reset...\n");

  const client = postgres(DATABASE_URL as string);

  try {
    // Drop and recreate the public schema to completely reset
    console.log("📋 Dropping and recreating schema...");
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`CREATE SCHEMA public`;
    console.log("✅ Schema reset complete\n");

    // Recreate all tables using drizzle-kit push (non-interactive)
    console.log("🔨 Recreating tables with drizzle-kit...");
    try {
      execSync("pnpm drizzle-kit push", {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      console.log("✅ Tables created\n");
    } catch (error) {
      console.error("⚠️  drizzle-kit push encountered an error");
      throw error;
    }

    // Seed default groups
    console.log("🌱 Seeding default groups...");
    const defaultGroups = [
      {
        id: crypto.randomUUID(),
        code: "essential",
        name: "Essencial",
        description:
          "Gastos fixos e obrigatórios: moradia, contas, mercado, transporte, saúde, educação",
        icon: "📌",
        displayOrder: 1,
      },
      {
        id: crypto.randomUUID(),
        code: "lifestyle",
        name: "Estilo de Vida",
        description:
          "Gastos variáveis de qualidade de vida: alimentação fora, vestuário, streaming, academia",
        icon: "🎨",
        displayOrder: 2,
      },
      {
        id: crypto.randomUUID(),
        code: "pleasures",
        name: "Prazeres",
        description:
          "Diversão pessoal de cada membro. Cada pessoa tem sua própria subcategoria.",
        icon: "🎉",
        displayOrder: 3,
      },
      {
        id: crypto.randomUUID(),
        code: "investments",
        name: "Investimentos",
        description:
          "Reservas e aplicações: emergência, previdência, poupança, investimentos",
        icon: "💰",
        displayOrder: 4,
      },
      {
        id: crypto.randomUUID(),
        code: "goals",
        name: "Metas",
        description: "Sonhos e objetivos com prazo: viagem, carro, casa, casamento",
        icon: "🎯",
        displayOrder: 5,
      },
    ];

    for (const group of defaultGroups) {
      await client`
        INSERT INTO "groups" (id, code, name, description, icon, display_order)
        VALUES (${group.id}, ${group.code}, ${group.name}, ${group.description}, ${group.icon}, ${group.displayOrder})
      `;
    }

    console.log("✅ Default groups seeded\n");

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ Database reset complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("You can now:");
    console.log("  • Test the onboarding flow from scratch");
    console.log("  • Create new budgets and accounts");
    console.log("  • Verify data relationships\n");
    console.log("To run your app: pnpm dev:no-inngest\n");
  } catch (error) {
    console.error("❌ Error resetting database:");
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
