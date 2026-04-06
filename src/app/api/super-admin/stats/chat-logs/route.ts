import { NextRequest, NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { db } from "@/db";
import { chatLogs } from "@/db/schema";
import { users } from "@/db/schema/user";
import { eq, sql, desc, gte } from "drizzle-orm";
import { subDays } from "date-fns";

/**
 * GET /api/super-admin/stats/chat-logs
 *
 * Returns:
 *  - stats: total messages, unique users, sessions count (last 7 days)
 *  - recentSessions: last 20 conversations with user info + message preview
 */
export const GET = withSuperAdminAuthRequired(async (req: NextRequest) => {
  const cutoff = subDays(new Date(), 7);

  const [statsResult, sessionsResult] = await Promise.all([
    // Aggregate stats for last 7 days
    db
      .select({
        totalMessages: sql<number>`COUNT(*)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${chatLogs.userId})`,
        totalSessions: sql<number>`COUNT(DISTINCT ${chatLogs.sessionId})`,
        userMessages: sql<number>`SUM(CASE WHEN ${chatLogs.role} = 'user' THEN 1 ELSE 0 END)`,
        assistantMessages: sql<number>`SUM(CASE WHEN ${chatLogs.role} = 'assistant' THEN 1 ELSE 0 END)`,
      })
      .from(chatLogs)
      .where(gte(chatLogs.createdAt, cutoff)),

    // Recent sessions with first/last message and user info
    db.execute(sql`
      WITH session_summary AS (
        SELECT
          cl.session_id,
          cl.user_id,
          COUNT(*) AS message_count,
          MIN(cl.created_at) AS started_at,
          MAX(cl.created_at) AS last_message_at,
          (SELECT cl2.content FROM chat_logs cl2 WHERE cl2.session_id = cl.session_id AND cl2.role = 'user' ORDER BY cl2.created_at ASC LIMIT 1) AS first_user_message,
          (SELECT cl3.content FROM chat_logs cl3 WHERE cl3.session_id = cl.session_id AND cl3.role = 'assistant' ORDER BY cl3.created_at DESC LIMIT 1) AS last_assistant_message
        FROM chat_logs cl
        WHERE cl.created_at >= ${cutoff.toISOString()}::timestamp
        GROUP BY cl.session_id, cl.user_id
        ORDER BY last_message_at DESC
        LIMIT 20
      )
      SELECT
        ss.*,
        u.name AS user_name,
        u.email AS user_email,
        u.image AS user_image
      FROM session_summary ss
      JOIN app_user u ON u.id = ss.user_id
    `),
  ]);

  const stats = statsResult[0];

  return NextResponse.json({
    stats: {
      totalMessages: Number(stats.totalMessages) || 0,
      uniqueUsers: Number(stats.uniqueUsers) || 0,
      totalSessions: Number(stats.totalSessions) || 0,
      userMessages: Number(stats.userMessages) || 0,
      assistantMessages: Number(stats.assistantMessages) || 0,
    },
    recentSessions: sessionsResult.rows,
  });
});
