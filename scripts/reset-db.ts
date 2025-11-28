import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import * as dotenv from "dotenv";
import * as path from "path";

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

  const client = postgres(DATABASE_URL);
  const db = drizzle(client);

  try {
    // Drop all schemas (CASCADE drops all objects)
    console.log("📋 Dropping all schemas...");
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`CREATE SCHEMA public`;
    console.log("✅ Schemas dropped and recreated\n");

    // Recreate tables
    console.log("🔨 Recreating tables from schema...");
    await client`
      CREATE TABLE IF NOT EXISTS "groups" (
        "id" text PRIMARY KEY,
        "code" text UNIQUE NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "icon" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp DEFAULT now()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS "app_user" (
        "id" text PRIMARY KEY,
        "name" text,
        "display_name" text,
        "email" text UNIQUE NOT NULL,
        "emailVerified" timestamp,
        "image" text,
        "password" text,
        "createdAt" timestamp DEFAULT now(),
        "onboarding_completed_at" timestamp,
        "credits" jsonb DEFAULT '{}',
        "stripeCustomerId" text,
        "stripeSubscriptionId" text,
        "planId" text
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS "plans" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "codename" text NOT NULL,
        "default" boolean DEFAULT false,
        "quotas" jsonb,
        "createdAt" timestamp DEFAULT now()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS "budgets" (
        "id" text PRIMARY KEY,
        "name" text NOT NULL,
        "description" text,
        "currency" text DEFAULT 'BRL',
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS "budget_members" (
        "id" text PRIMARY KEY,
        "budget_id" text NOT NULL REFERENCES "budgets"("id") ON DELETE CASCADE,
        "user_id" text REFERENCES "app_user"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "type" text NOT NULL DEFAULT 'owner',
        "color" text DEFAULT '#6366f1',
        "monthly_pleasure_budget" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS "financial_accounts" (
        "id" text PRIMARY KEY,
        "budget_id" text NOT NULL REFERENCES "budgets"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "type" text NOT NULL,
        "color" text DEFAULT '#6366f1',
        "icon" text,
        "balance" integer NOT NULL DEFAULT 0,
        "cleared_balance" integer NOT NULL DEFAULT 0,
        "credit_limit" integer,
        "closing_day" integer,
        "due_day" integer,
        "is_archived" boolean DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id" text PRIMARY KEY,
        "budget_id" text NOT NULL REFERENCES "budgets"("id") ON DELETE CASCADE,
        "group_id" text NOT NULL REFERENCES "groups"("id"),
        "member_id" text REFERENCES "budget_members"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "icon" text,
        "color" text DEFAULT '#6366f1',
        "behavior" text NOT NULL DEFAULT 'refill_up',
        "planned_amount" integer NOT NULL DEFAULT 0,
        "target_amount" integer,
        "target_date" timestamp,
        "is_archived" boolean DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;

    console.log("✅ Tables created\n");

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
    console.log("To run your app: pnpm dev\n");
  } catch (error) {
    console.error("❌ Error resetting database:");
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
