import { db } from "@/db";
import { coupons } from "@/db/schema/coupons";
import { eq, and, isNull } from "drizzle-orm";
import { updateLTDPlan } from "@/shared/lib/users/updateLTDPlan";
import { z } from "zod";
import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import {
  validationError,
  errorResponse,
  successResponse,
  internalError,
} from "@/shared/lib/api/responses";

// Validation schema for the request body
const redeemSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
});

export const POST = withAuthRequired(async (req, context) => {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const parsedBody = redeemSchema.safeParse(body);

    if (!parsedBody.success) {
      return validationError(parsedBody.error);
    }

    const { code } = parsedBody.data;
    const currentUser = await context.session.user;

    // Find the coupon by code
    const coupon = await db
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, code.toUpperCase()),
          isNull(coupons.usedAt),
          eq(coupons.expired, false)
        )
      )
      .limit(1)
      .then((results) => results[0]);

    // If coupon not found or is invalid
    if (!coupon) {
      return errorResponse("The coupon code is invalid, expired, or has already been used.", 400);
    }

    // Mark the coupon as used by this user
    await db
      .update(coupons)
      .set({
        usedAt: new Date(),
        userId: currentUser.id,
      })
      .where(eq(coupons.id, coupon.id));

    // Update the user's plan based on redeemed coupons
    const result = await updateLTDPlan(currentUser.id);

    return successResponse({
      success: true,
      message: "Coupon redeemed successfully",
      user: result.user,
      plan: result.plan,
      couponCount: result.couponCount,
    });
  } catch (error) {
    console.error("Error redeeming coupon:", error);
    return internalError("Failed to redeem coupon");
  }
});
