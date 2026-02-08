import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";

const logger = createLogger("api:admin:coupons");
import { coupons } from "@/db/schema/coupons";
import { desc, eq, like, sql, and, isNull, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

export const GET = withSuperAdminAuthRequired(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(like(coupons.code, `%${search}%`));
    }

    if (status === "used") {
      conditions.push(isNotNull(coupons.usedAt));
    } else if (status === "unused") {
      conditions.push(isNull(coupons.usedAt));
      conditions.push(eq(coupons.expired, false));
    } else if (status === "expired") {
      conditions.push(eq(coupons.expired, true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [couponsList, totalCount] = await Promise.all([
      db
        .select()
        .from(coupons)
        .where(whereClause)
        .orderBy(desc(coupons.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(coupons)
        .where(whereClause)
        .then((res) => Number(res[0].count)),
    ]);

    return NextResponse.json({
      coupons: couponsList,
      totalItems: totalCount,
      page,
      limit,
    });
  } catch (error) {
    logger.error("Error fetching coupons:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
});

export const POST = withSuperAdminAuthRequired(async (req, { session }) => {
  try {
    const { prefix, count } = await req.json();

    if (!prefix || !count || count <= 0) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const codes = Array.from({ length: count }, () => {
      const uniquePart = nanoid(8).toUpperCase();
      return `${prefix}-${uniquePart}`;
    });

    const couponsToInsert = codes.map((code) => ({
      code,
      expired: false,
    }));

    await db.insert(coupons).values(couponsToInsert);

    void recordAuditLog({
      userId: session.user.id!,
      action: "admin.coupon_create",
      resource: "coupon",
      details: { count, type: prefix },
      req,
    });

    return NextResponse.json({ codes });
  } catch (error) {
    logger.error("Error generating coupons:", error);
    return NextResponse.json(
      { error: "Failed to generate coupons" },
      { status: 500 }
    );
  }
}); 