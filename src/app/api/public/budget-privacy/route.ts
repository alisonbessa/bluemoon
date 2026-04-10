import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { budgets, budgetMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { errorResponse, internalError } from "@/shared/lib/api/responses";
import { SignJWT, jwtVerify } from "jose";

const logger = createLogger("api:public:budget-privacy");

const PRIVACY_TOKEN_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "fallback-secret"
);

export async function signPrivacyToken(payload: { budgetId: string; membershipId: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(PRIVACY_TOKEN_SECRET);
}

async function verifyPrivacyToken(token: string) {
  const { payload } = await jwtVerify(token, PRIVACY_TOKEN_SECRET);
  return payload as { budgetId: string; membershipId: string };
}

// GET - Confirm or reject privacy change (via signed email link, no login required)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const token = searchParams.get("token");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";

  if (!action || !token) {
    return errorResponse("Missing parameters", 400);
  }

  if (action !== "confirm" && action !== "reject") {
    return errorResponse("Invalid action", 400);
  }

  try {
    // Verify the signed token (contains budgetId + membershipId, expires in 7 days)
    let payload: { budgetId: string; membershipId: string };
    try {
      payload = await verifyPrivacyToken(token);
    } catch {
      return errorResponse("Link expirado ou invalido. Solicite uma nova alteracao.", 400);
    }

    const { budgetId, membershipId } = payload;

    // Verify the membership exists
    const [membership] = await db
      .select()
      .from(budgetMembers)
      .where(eq(budgetMembers.id, membershipId))
      .limit(1);

    if (!membership) {
      return errorResponse("Membro nao encontrado", 404);
    }

    // Get current budget
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, budgetId))
      .limit(1);

    if (!budget || !budget.pendingPrivacyMode) {
      return Response.redirect(`${baseUrl}/app/settings?privacyAlreadyProcessed=true`);
    }

    // Verify the confirming user is NOT the one who requested (must be partner)
    if (budget.privacyChangeRequestedBy === membershipId) {
      return errorResponse("Voce nao pode confirmar sua propria solicitacao", 400);
    }

    if (action === "confirm") {
      await db
        .update(budgets)
        .set({
          privacyMode: budget.pendingPrivacyMode,
          pendingPrivacyMode: null,
          privacyChangeRequestedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(budgets.id, budgetId));

      return Response.redirect(`${baseUrl}/app/settings?privacyChanged=true`);
    } else {
      await db
        .update(budgets)
        .set({
          pendingPrivacyMode: null,
          privacyChangeRequestedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(budgets.id, budgetId));

      return Response.redirect(`${baseUrl}/app/settings?privacyRejected=true`);
    }
  } catch (error) {
    logger.error("Error processing privacy change:", error);
    return internalError("Failed to process privacy change");
  }
}
