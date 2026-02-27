/**
 * Roles that don't require a Stripe subscription to access the app
 */
export const SUBSCRIPTION_EXEMPT_ROLES = ["beta", "lifetime", "admin"] as const;

/**
 * Pages that don't require an active subscription
 */
export const SUBSCRIPTION_EXEMPT_PATHS = [
  "/app/choose-plan",
  "/app/settings",
  "/app/subscribe",
] as const;
