import { inngest } from "../client";
import { executeRetentionCampaigns } from "@/shared/lib/email/retention-runner";

/**
 * Runs every day at 13:00 UTC (10:00 Brasilia). Delegates to the shared
 * retention runner (src/shared/lib/email/retention-runner.ts) so the same
 * logic can be triggered manually from the super-admin "Run now" endpoint.
 */
export const runRetentionCampaigns = inngest.createFunction(
  { id: "run-retention-campaigns", name: "Run Retention Campaigns" },
  { cron: "0 13 * * *" },
  async ({ step }) => {
    return step.run("execute", async () => executeRetentionCampaigns());
  }
);
