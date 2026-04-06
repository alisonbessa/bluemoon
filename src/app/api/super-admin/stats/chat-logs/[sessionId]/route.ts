import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { chatLogs } from "@/db/schema";
import { users } from "@/db/schema/user";
import { eq, asc } from "drizzle-orm";

export const GET = withSuperAdminAuthRequired(async (_req, { params }) => {
  const { sessionId } = await params as { sessionId: string };

  const messages = await db
    .select({
      id: chatLogs.id,
      role: chatLogs.role,
      content: chatLogs.content,
      createdAt: chatLogs.createdAt,
      userId: chatLogs.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(chatLogs)
    .leftJoin(users, eq(chatLogs.userId, users.id))
    .where(eq(chatLogs.sessionId, sessionId))
    .orderBy(asc(chatLogs.createdAt));

  return NextResponse.json({ messages, sessionId });
});
