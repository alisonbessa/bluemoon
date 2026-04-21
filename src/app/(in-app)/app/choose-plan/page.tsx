"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Check, Users, User, Sparkles, Loader2 } from "lucide-react";
import getSubscribeUrl, {
  PlanProvider,
  PlanType,
  DEFAULT_TRIAL_PERIOD_DAYS,
} from "@/shared/lib/plans/getSubscribeUrl";
import { useSubscriptionGate } from "@/shared/hooks/use-subscription-gate";
import { useUser } from "@/shared/hooks/use-current-user";
import { mutate } from "swr";

interface PlanPricing {
  price: number | null;
  priceAnchor: number | null;
  priceFormatted: string | null;
  monthlyEquivalent?: string | null;
}

interface Plan {
  id: string;
  name: string;
  codename: string;
  pricing: {
    monthly: PlanPricing | null;
    yearly: PlanPricing | null;
  };
  quotas: {
    maxBudgetMembers?: number;
    premiumSupport?: boolean;
    monthlyImages?: number;
  } | null;
  features: string[];
}

interface PlansResponse {
  plans: Plan[];
  trialDays: number;
}

export default function ChoosePlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReturningUser, status: subscriptionStatus } = useSubscriptionGate();
  const { user } = useUser();
  const isBetaUser = user?.role === "beta";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [trialDays, setTrialDays] = useState(DEFAULT_TRIAL_PERIOD_DAYS);

  // Get pre-selected plan from URL params
  const preSelectedPlan = searchParams.get("plan");
  const preSelectedBilling = searchParams.get("billing");
  const [isYearly, setIsYearly] = useState(preSelectedBilling === "yearly");

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch("/api/app/plans");
        if (!response.ok) throw new Error("Failed to fetch plans");
        const data: PlansResponse = await response.json();
        setPlans(data.plans);
        setTrialDays(data.trialDays);

        // If plan was pre-selected from landing page, auto-redirect to Stripe
        // Skip auto-redirect for beta users (they don't use Stripe)
        if (preSelectedPlan && preSelectedBilling && !isBetaUser) {
          const validPlans = ["solo", "duo"];
          const validBilling = ["monthly", "yearly"];

          if (validPlans.includes(preSelectedPlan) && validBilling.includes(preSelectedBilling)) {
            setIsRedirecting(true);
            const url = getSubscribeUrl({
              codename: preSelectedPlan,
              type: preSelectedBilling === "yearly" ? PlanType.YEARLY : PlanType.MONTHLY,
              provider: PlanProvider.STRIPE,
              trialPeriodDays: data.trialDays,
            });
            router.push(url);
          }
        }
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlans();
  }, [preSelectedPlan, preSelectedBilling, router]);

  const handleSelectPlan = async (codename: string) => {
    if (isBetaUser) {
      setIsRedirecting(true);
      try {
        const response = await fetch("/api/app/plans/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codename }),
        });
        if (!response.ok) throw new Error("Erro ao selecionar plano");
        await mutate("/api/app/me");
        router.push("/app");
      } catch {
        setIsRedirecting(false);
      }
      return;
    }

    const url = getSubscribeUrl({
      codename,
      type: isYearly ? PlanType.YEARLY : PlanType.MONTHLY,
      provider: PlanProvider.STRIPE,
      trialPeriodDays: trialDays,
    });
    router.push(url);
  };

  const soloPlan = plans.find((p) => p.codename === "solo");
  const duoPlan = plans.find((p) => p.codename === "duo");

  // Calculate savings for yearly
  const getYearlySavings = (plan: Plan) => {
    if (!plan.pricing.monthly?.price || !plan.pricing.yearly?.price) return null;
    const yearlyCostIfMonthly = plan.pricing.monthly.price * 12;
    const savings = yearlyCostIfMonthly - plan.pricing.yearly.price;
    return savings > 0 ? Math.round((savings / yearlyCostIfMonthly) * 100) : null;
  };

  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-dvh w-full overflow-x-hidden flex items-center justify-center px-4">
        <div className="w-full max-w-4xl py-10">
          {isRedirecting ? (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-bold mb-2">Preparando seu trial...</h2>
              <p className="text-muted-foreground">
                Você será redirecionado para completar seu cadastro.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <Skeleton className="h-10 w-64 mx-auto mb-4" />
                <Skeleton className="h-6 w-96 mx-auto" />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-[500px]" />
                <Skeleton className="h-[500px]" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full overflow-x-hidden flex items-center justify-center px-4">
      <div className="w-full max-w-4xl py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {isBetaUser
              ? "Como você quer usar o HiveBudget?"
              : isReturningUser
                ? "Bem-vindo de volta!"
                : "Escolha seu plano"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isBetaUser
              ? "Escolha o plano que combina com você. Ambos são gratuitos durante o beta."
              : isReturningUser
                ? "Reative seu plano para continuar gerenciando suas finanças."
                : `Comece com ${trialDays} dias grátis. Cancele a qualquer momento.`}
          </p>
        </div>

        {/* Billing Toggle - hidden for beta users */}
        {!isBetaUser && (
          <div className="flex items-center justify-center gap-4 mb-8">
            <Label
              htmlFor="billing-toggle"
              className={!isYearly ? "font-semibold" : "text-muted-foreground"}
            >
              Mensal
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <div className="flex items-center gap-2">
              <Label
                htmlFor="billing-toggle"
                className={isYearly ? "font-semibold" : "text-muted-foreground"}
              >
                Anual
              </Label>
              <Badge variant="secondary" className="text-xs">
                Economize até 20%
              </Badge>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Solo Plan */}
          {soloPlan && (
            <Card className="relative flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{soloPlan.name}</CardTitle>
                </div>
                <CardDescription>
                  Perfeito para gerenciar suas finanças pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {/* Price */}
                {isBetaUser ? (
                  <div className="mb-6">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      Grátis durante o beta
                    </Badge>
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        {isYearly
                          ? soloPlan.pricing.yearly?.priceFormatted
                          : soloPlan.pricing.monthly?.priceFormatted}
                      </span>
                      <span className="text-muted-foreground">
                        /{isYearly ? "ano" : "mês"}
                      </span>
                    </div>
                    {isYearly && soloPlan.pricing.yearly?.monthlyEquivalent && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {soloPlan.pricing.yearly.monthlyEquivalent}/mês
                        {getYearlySavings(soloPlan) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {getYearlySavings(soloPlan)}% off
                          </Badge>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-3">
                  {soloPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSelectPlan("solo")}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isBetaUser ? (
                    "Escolher Solo"
                  ) : isReturningUser ? (
                    "Reativar com Solo"
                  ) : (
                    "Começar trial grátis"
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Duo Plan */}
          {duoPlan && (
            <Card className="relative flex flex-col border-primary">
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="px-3 py-1">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {isBetaUser ? "Para casais" : "Mais popular"}
                </Badge>
              </div>

              <CardHeader className="pt-8">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{duoPlan.name}</CardTitle>
                </div>
                <CardDescription>
                  Ideal para casais e parceiros que compartilham finanças
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {/* Price */}
                {isBetaUser ? (
                  <div className="mb-6">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      Grátis durante o beta
                    </Badge>
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        {isYearly
                          ? duoPlan.pricing.yearly?.priceFormatted
                          : duoPlan.pricing.monthly?.priceFormatted}
                      </span>
                      <span className="text-muted-foreground">
                        /{isYearly ? "ano" : "mês"}
                      </span>
                    </div>
                    {isYearly && duoPlan.pricing.yearly?.monthlyEquivalent && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {duoPlan.pricing.yearly.monthlyEquivalent}/mês
                        {getYearlySavings(duoPlan) && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {getYearlySavings(duoPlan)}% off
                          </Badge>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {/* Features */}
                <ul className="space-y-3">
                  {duoPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSelectPlan("duo")}
                  disabled={isRedirecting}
                >
                  {isRedirecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isBetaUser ? (
                    "Escolher Duo"
                  ) : isReturningUser ? (
                    "Reativar com Duo"
                  ) : (
                    "Começar trial grátis"
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Trial/Beta Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            {isBetaUser ? (
              <>
                Acesso completo e gratuito enquanto a plataforma estiver em beta.
                <br />
                Você poderá mudar de plano depois, se quiser.
              </>
            ) : isReturningUser ? (
              <>
                Seus dados continuam salvos e serão acessíveis assim que reativar.
                <br />
                A cobrança será imediata, sem novo período de trial.
              </>
            ) : (
              <>
                Seu cartão será salvo mas você só será cobrado após {trialDays} dias.
                <br />
                Cancele a qualquer momento durante o trial sem nenhuma cobrança.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
