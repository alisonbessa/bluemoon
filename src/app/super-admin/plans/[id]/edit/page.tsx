"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PlanForm } from "@/shared/forms/plan-form";
import { Button } from "@/shared/ui/button";
import { ArrowLeft, CloudUpload, CheckCircle } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import type { PlanFormValues } from "@/shared/lib/validations/plan.schema";
import { SyncStripeModal } from "../../components/sync-stripe-modal";

export default function EditPlanPage() {
  const { id } = useParams();
  const router = useRouter();
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const { data: plan, error, mutate } = useSWR<PlanFormValues>(
    `/api/super-admin/plans/${id}`
  );

  const handleSubmit = async (data: PlanFormValues) => {
    try {
      const response = await fetch("/api/super-admin/plans", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id }),
      });

      if (!response.ok) {
        throw new Error("Failed to update plan");
      }

      router.push("/super-admin/plans");
    } catch (error) {
      console.error("Error updating plan:", error);
      // TODO: Add error toast
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-14rem)]">
        <div className="text-center">
          <h2 className="text-lg font-medium">Error loading plan</h2>
          <p className="text-sm text-muted-foreground">
            Failed to load plan details. Please try again.
          </p>
          <Button variant="ghost" size="sm" asChild className="mt-4">
            <Link href="/super-admin/plans">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Plans
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const hasSyncedPrices = Boolean(
    plan?.monthlyStripePriceId ||
      plan?.yearlyStripePriceId ||
      plan?.onetimeStripePriceId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/plans">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Edit Plan</h1>
        </div>
        {plan && (
          <Button
            variant={hasSyncedPrices ? "outline" : "default"}
            onClick={() => setIsSyncModalOpen(true)}
          >
            {hasSyncedPrices ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                Stripe Synced
              </>
            ) : (
              <>
                <CloudUpload className="h-4 w-4 mr-2" />
                Sync to Stripe
              </>
            )}
          </Button>
        )}
      </div>

      <div className="border rounded-lg p-4">
        {plan ? (
          <PlanForm
            initialData={plan}
            onSubmit={handleSubmit}
            submitLabel="Update Plan"
          />
        ) : (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="text-lg">Loading...</div>
              <div className="text-sm text-muted-foreground">
                Please wait while we load the plan details.
              </div>
            </div>
          </div>
        )}
      </div>

      {plan && (
        <SyncStripeModal
          open={isSyncModalOpen}
          onOpenChange={setIsSyncModalOpen}
          planId={id as string}
          planName={plan.name || ""}
          hasMonthly={plan.hasMonthlyPricing || false}
          hasYearly={plan.hasYearlyPricing || false}
          hasOnetime={plan.hasOnetimePricing || false}
          monthlyPrice={plan.monthlyPrice || 0}
          yearlyPrice={plan.yearlyPrice || 0}
          onetimePrice={plan.onetimePrice || 0}
          currentMonthlyPriceId={plan.monthlyStripePriceId || null}
          currentYearlyPriceId={plan.yearlyStripePriceId || null}
          currentOnetimePriceId={plan.onetimeStripePriceId || null}
          onSyncComplete={() => mutate()}
        />
      )}
    </div>
  );
}
