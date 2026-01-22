import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/user";
import APIError from "../api/errors";
import { plans } from "@/db/schema/plans";

const updatePlan = async ({
  userId,
  newPlanId,
  sendEmail = true,
}: {
  userId: string;
  newPlanId: string;
  sendEmail?: boolean;
}) => {
  await db.update(users).set({ planId: newPlanId }).where(eq(users.id, userId));
  if (sendEmail) {
    const plan = await db
      .select({ name: plans.name })
      .from(plans)
      .where(eq(plans.id, newPlanId))
      .limit(1);

    if (!plan) {
      throw new APIError("Plan not found");
    }

    // TODO: Send email notification about plan change
  }
};

export default updatePlan;
