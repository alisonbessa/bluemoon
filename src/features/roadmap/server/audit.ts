import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-log";
import type { NextRequest } from "next/server";

type RoadmapAdminAction =
  | "status_change"
  | "update"
  | "create"
  | "delete"
  | "merge"
  | "promote";

interface Params {
  userId: string | null;
  action: RoadmapAdminAction;
  resourceId: string;
  details?: Record<string, unknown>;
  req?: NextRequest;
}

function getRequestInfo(req?: NextRequest) {
  if (!req) return { ipAddress: null, userAgent: null };
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  return { ipAddress: ip, userAgent: req.headers.get("user-agent") || null };
}

/**
 * Record a super-admin action on the roadmap. Non-blocking — failures are
 * swallowed so the main flow is never broken by audit logging.
 */
export async function recordRoadmapAdminAction(params: Params): Promise<void> {
  try {
    const { ipAddress, userAgent } = getRequestInfo(params.req);
    await db.insert(auditLogs).values({
      userId: params.userId,
      action: `roadmap.${params.action}`,
      resource: "roadmap_item",
      resourceId: params.resourceId,
      details: params.details ?? null,
      ipAddress,
      userAgent,
    });
  } catch {
    // swallow
  }
}
