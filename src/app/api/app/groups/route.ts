import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { groups, defaultGroups } from "@/db/schema";
import { NextResponse } from "next/server";

// GET - Get all groups (with optional seeding)
export const GET = withAuthRequired(async () => {
  // Check if groups exist, seed if needed
  let existingGroups = await db.select().from(groups).orderBy(groups.displayOrder);

  if (existingGroups.length === 0) {
    // Seed default groups
    await db.insert(groups).values(
      defaultGroups.map((g) => ({
        code: g.code,
        name: g.name,
        description: g.description,
        icon: g.icon,
        displayOrder: g.displayOrder,
      }))
    );
    existingGroups = await db.select().from(groups).orderBy(groups.displayOrder);
  }

  return NextResponse.json({ groups: existingGroups });
});
