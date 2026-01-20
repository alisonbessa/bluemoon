import { PlanProvider } from "@/shared/lib/plans/getSubscribeUrl";
import SuccessRedirector from "./SuccessRedirector";
// Removed: DodoPayments - only Stripe is supported
// import client from "@/shared/lib/dodopayments/client";
import ErrorRedirector from "./ErrorRedirector";

export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string; // STRIPE
    provider: PlanProvider;
  }>;
}) {
  // Only Stripe provider is now supported
  // No additional validation needed for success page
  return <SuccessRedirector />;
}
