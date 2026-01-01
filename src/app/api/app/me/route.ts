import withAuthRequired from "@/lib/auth/withAuthRequired";
import { profileUpdateSchema } from "@/lib/validations/profile.schema";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { MeResponse } from "./types";

export const GET = withAuthRequired(async (req, context) => {
  const { getCurrentPlan, getUser } = context;

  // You can also use context.session to get user id and email
  // from the jwt token (no database call is made in that case)

  const userFromDb = await getUser();

  // If user doesn't exist in database, return 401 to force re-login
  if (!userFromDb) {
    return NextResponse.json(
      { error: "User not found", message: "Please sign in again" },
      { status: 401 }
    );
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
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return updated user data
    return NextResponse.json({
      user: updatedUser[0],
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;

    // Delete the user - cascade will handle related data
    await db.delete(users).where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
});
