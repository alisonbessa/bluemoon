/**
 * Roles that don't require a Stripe subscription to access the app
 */
export const SUBSCRIPTION_EXEMPT_ROLES: string[] = ["beta", "lifetime", "admin"];

/**
 * Pages that don't require an active subscription
 */
export const SUBSCRIPTION_EXEMPT_PATHS: string[] = [
  "/app/choose-plan",
  "/app/setup",
  "/app/partner-welcome",
  "/app/settings",
  "/app/subscribe",
];
