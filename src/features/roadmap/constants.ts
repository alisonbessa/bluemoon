import type { UserRole } from "@/db/schema/user";

/**
 * Roles that can access Laboratório Beta (roadmap + feature requests).
 * Admin included so support/dev can see the feature.
 */
export const BETA_LAB_ROLES = ["beta", "lifetime", "admin"] as const satisfies readonly UserRole[];

export function canAccessBetaLab(role: UserRole | null | undefined): boolean {
  if (!role) return false;
  return (BETA_LAB_ROLES as readonly string[]).includes(role);
}
