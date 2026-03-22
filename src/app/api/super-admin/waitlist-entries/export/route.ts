import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { waitlist } from "@/db/schema/waitlist";
import { desc } from "drizzle-orm";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("api:sa:waitlist-export");

export const GET = withSuperAdminAuthRequired(async () => {
  try {
    // Get all entries ordered by creation date
    const entries = await db
      .select()
      .from(waitlist)
      .orderBy(desc(waitlist.createdAt));

    // Convert to CSV format
    const csvHeader = "Name,Email,Instagram Account,Beta Tester,Joined Date\n";
    const csvRows = entries.map((entry) => {
      const name = (entry.name || "").replace(/,/g, ""); // Remove commas from fields
      const email = (entry.email || "").replace(/,/g, "");
      const instagram = entry.instagramAccount?.replace(/,/g, "") || "";
      const beta = entry.betaTester ? "Yes" : "No";
      const date = entry.createdAt
        ? new Date(entry.createdAt).toLocaleDateString()
        : "";
      return `${name},${email},${instagram},${beta},${date}`;
    });
    const csvContent = csvHeader + csvRows.join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="waitlist-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error("Error exporting waitlist", error);
    return NextResponse.json(
      { error: "Failed to export waitlist" },
      { status: 500 }
    );
  }
});
