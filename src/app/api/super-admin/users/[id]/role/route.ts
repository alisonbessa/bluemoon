import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { users, userRoleEnum } from "@/db/schema/user";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/super-admin/users/[id]/role
 *
 * Update a user's role (user, beta, lifetime, admin)
 */
export const PATCH = withSuperAdminAuthRequired(async (req, { params }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    // Validate role
    const validRoles = userRoleEnum.options;
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Role inválido. Deve ser um de: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if user exists
    const [existingUser] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id as string))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Update role
    await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id as string));

    return NextResponse.json({
      success: true,
      message: `Role atualizado para ${role}`,
      previousRole: existingUser.role,
      newRole: role,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar role" },
      { status: 500 }
    );
  }
});
