import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { coupons } from "@/db/schema/coupons";
import { eq } from "drizzle-orm";

const logger = createLogger("api:admin:coupons:detail");

export const PATCH = withSuperAdminAuthRequired(async (req, context) => {
  const id = (await context.params).id as string;
  if (!id) {
    return NextResponse.json(
      { error: "Coupon ID is required" },
      { status: 400 }
    );
  }

  try {
    await db
      .update(coupons)
      .set({ expired: true })
      .where(eq(coupons.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error expiring coupon:", error);
    return NextResponse.json(
      { error: "Failed to expire coupon" },
      { status: 500 }
    );
  }
});

export const DELETE = withSuperAdminAuthRequired(async (req, context) => {
  const id = (await context.params).id as string;
  if (!id) {
    return NextResponse.json(
      { error: "Coupon ID is required" },
      { status: 400 }
    );
  }

  try {
    await db
      .delete(coupons)
      .where(eq(coupons.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting coupon:", error);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}); 