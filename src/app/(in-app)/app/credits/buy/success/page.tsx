import { PlanProvider } from "@/lib/plans/getSubscribeUrl";
import CreditsSuccessRedirector from "./CreditsSuccessRedirector";

export default async function CreditsSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    sessionId?: string; // STRIPE
    provider: PlanProvider;
    creditType?: string;
    amount?: string;
  }>;
}) {
  // Only Stripe provider is now supported
  // No additional validation needed for success page
  return <CreditsSuccessRedirector />;
}
