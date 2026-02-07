import { NextResponse } from "next/server";
import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { stripe } from "@/integrations/stripe/client";

const logger = createLogger("api:admin:stripe-status");

interface StripeStatusResponse {
  connected: boolean;
  mode: "test" | "live" | "unknown";
  account?: {
    id: string;
    name: string | null;
    email: string | null;
    country: string | null;
  };
  products: {
    total: number;
    active: number;
  };
  prices: {
    total: number;
    active: number;
  };
  webhooks: {
    configured: boolean;
    endpoints: Array<{
      id: string;
      url: string;
      status: string;
      enabledEvents: number;
    }>;
  };
  error?: string;
}

export const GET = withSuperAdminAuthRequired(async () => {
  const response: StripeStatusResponse = {
    connected: false,
    mode: "unknown",
    products: { total: 0, active: 0 },
    prices: { total: 0, active: 0 },
    webhooks: { configured: false, endpoints: [] },
  };

  try {
    // Check API key mode
    const secretKey = process.env.STRIPE_SECRET_KEY || "";
    if (secretKey.startsWith("sk_test_")) {
      response.mode = "test";
    } else if (secretKey.startsWith("sk_live_")) {
      response.mode = "live";
    }

    // Test connection by fetching account info
    const account = await stripe.accounts.retrieve();
    response.connected = true;
    response.account = {
      id: account.id,
      name: account.business_profile?.name || null,
      email: account.email || null,
      country: account.country || null,
    };

    // Get products count
    const products = await stripe.products.list({ limit: 100 });
    response.products.total = products.data.length;
    response.products.active = products.data.filter((p) => p.active).length;

    // Get prices count
    const prices = await stripe.prices.list({ limit: 100 });
    response.prices.total = prices.data.length;
    response.prices.active = prices.data.filter((p) => p.active).length;

    // Get webhooks
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
      response.webhooks.configured = webhooks.data.length > 0;
      response.webhooks.endpoints = webhooks.data.map((wh) => ({
        id: wh.id,
        url: wh.url,
        status: wh.status,
        enabledEvents: wh.enabled_events?.length || 0,
      }));
    } catch {
      // Webhooks API might not be available in connect accounts
      response.webhooks.configured = false;
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Error checking Stripe status:", error);
    response.error =
      error instanceof Error ? error.message : "Falha ao conectar com Stripe";
    return NextResponse.json(response, { status: 500 });
  }
});
