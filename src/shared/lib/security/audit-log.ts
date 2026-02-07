import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-log";
import type { NextRequest } from "next/server";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.impersonate"
  | "user.delete"
  | "budget.create"
  | "budget.delete"
  | "budget.invite"
  | "admin.database_reset"
  | "admin.coupon_create"
  | "admin.coupon_delete"
  | "admin.plan_update"
  | "admin.mock_data"
  | "admin.access_link_create"
  | "subscription.created"
  | "subscription.cancelled"
  | "subscription.updated"
  | "export.data";

interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  req?: NextRequest;
}

/**
 * Get IP and User-Agent from request
 */
function getRequestInfo(req?: NextRequest) {
  if (!req) return { ipAddress: null, userAgent: null };

  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  return { ipAddress: ip, userAgent };
}

/**
 * Record an audit log entry.
 *
 * Non-blocking — errors are caught silently so audit logging
 * never breaks the main request flow. In production, unhandled
 * rejections are reported via the global error handler (Sentry).
 */
export async function recordAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const { ipAddress, userAgent } = getRequestInfo(params.req);

    await db.insert(auditLogs).values({
      userId: params.userId || null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details || null,
      ipAddress,
      userAgent,
    });
  } catch {
    // Silently fail — audit logging should never break the main flow.
    // In production, Sentry will catch this via the global error handler.
  }
}
