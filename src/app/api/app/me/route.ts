import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { profileUpdateSchema } from "@/shared/lib/validations/profile.schema";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MeResponse } from "./types";
import {
  validationError,
  unauthorizedError,
  notFoundError,
  successResponse,
  internalError,
} from "@/shared/lib/api/responses";

export const GET = withAuthRequired(async (req, context) => {
  const { getCurrentPlan, getUser } = context;

  // You can also use context.session to get user id and email
  // from the jwt token (no database call is made in that case)

  const userFromDb = await getUser();

  // If user doesn't exist in database, return 401 to force re-login
  if (!userFromDb) {
    return unauthorizedError("User not found - please sign in again");
  }

  const currentPlan = await getCurrentPlan();
  return NextResponse.json<MeResponse>({
    user: userFromDb,
    currentPlan,
  });
});

export const PATCH = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const body = await req.json();

    // Validate input data
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return validationError(validationResult.error);
    }

    const { name, displayName, image } = validationResult.data;

    // Build update object with only provided fields
    const updateData: Record<string, string | null | undefined> = {};
    if (name !== undefined) updateData.name = name;
    if (displayName !== undefined) updateData.displayName = displayName;
    if (image !== undefined) updateData.image = image;

    // Update user in database
    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, session.user.id))
      .returning();

    if (!updatedUser.length) {
      return notFoundError("User");
    }

    // Return updated user data
    return successResponse({
      user: updatedUser[0],
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return internalError("Failed to update profile");
  }
});

export const DELETE = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;

    // Delete the user - cascade will handle related data
    await db.delete(users).where(eq(users.id, session.user.id));

    return successResponse({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return internalError("Failed to delete account");
  }
});
