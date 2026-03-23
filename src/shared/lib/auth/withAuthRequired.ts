import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { plans } from "@/db/schema/plans";
import { MeResponse } from "@/app/api/app/me/types";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";

interface WithManagerHandler {
  (
    req: NextRequest,
    context: {
      session: NonNullable<
        Session & {
          user: {
            id: string;
            email: string;
          };
        }
      >;
      getCurrentPlan: () => Promise<MeResponse["currentPlan"]>;
      getUser: () => Promise<MeResponse["user"]>;
      getBudgetIds: () => Promise<string[]>;
      params: Promise<Record<string, unknown>>;
    }
  ): Promise<NextResponse | Response>;
}

const withAuthRequired = (handler: WithManagerHandler) => {
  return async (
    req: NextRequest,
    context: {
      params: Promise<Record<string, unknown>>;
    }
  ) => {
    const session = await auth();

    if (!session || !session.user || !session.user.id || !session.user.email) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "You are not authorized to perform this action",
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Cached user data (lazy, shared across getUser and getCurrentPlan)
    let _user: MeResponse["user"] | undefined;
    const getUser = async () => {
      if (!_user) {
        const [user] = await db
          .select({
            id: users.id,
            name: users.name,
            displayName: users.displayName,
            email: users.email,
            image: users.image,
            createdAt: users.createdAt,
            onboardingCompletedAt: users.onboardingCompletedAt,
            planId: users.planId,
            stripeCustomerId: users.stripeCustomerId,
            stripeSubscriptionId: users.stripeSubscriptionId,
            emailVerified: users.emailVerified,
            credits: users.credits,
            role: users.role,
            trialEndsAt: users.trialEndsAt,
            accessLinkId: users.accessLinkId,
            deletedAt: users.deletedAt,
            deletionRequestedAt: users.deletionRequestedAt,
            deletionReason: users.deletionReason,
          })
          .from(users)
          .where(eq(users.id, userId));
        _user = user;
      }
      return _user;
    };

    // Optimized: reuses planId from getUser() instead of querying users table again
    const getCurrentPlan = async () => {
      const user = await getUser();
      if (!user?.planId) return null;

      const [currentPlan] = await db
        .select({
          id: plans.id,
          name: plans.name,
          codename: plans.codename,
          quotas: plans.quotas,
          default: plans.default,
        })
        .from(plans)
        .where(eq(plans.id, user.planId));

      return currentPlan ?? null;
    };

    // Lazy-loaded budget IDs (cached per request to avoid duplicate DB queries)
    let _budgetIds: string[] | null = null;
    const getBudgetIds = async () => {
      if (!_budgetIds) _budgetIds = await getUserBudgetIds(userId);
      return _budgetIds;
    };

    return await handler(req, {
      ...context,
      session: session,
      getCurrentPlan,
      getUser,
      getBudgetIds,
    });
  };
};

export default withAuthRequired;
