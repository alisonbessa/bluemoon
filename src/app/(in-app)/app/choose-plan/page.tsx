"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Check, Users, User, Sparkles } from "lucide-react";
import getSubscribeUrl, {
  PlanProvider,
  PlanType,
  DEFAULT_TRIAL_PERIOD_DAYS,
} from "@/shared/lib/plans/getSubscribeUrl";

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isYearly, setIsYearly] = useState(false);
  const [trialDays, setTrialDays] = useState(DEFAULT_TRIAL_PERIOD_DAYS);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const response = await fetch("/api/app/plans");
        if (!response.ok) throw new Error("Failed to fetch plans");
        const data: PlansResponse = await response.json();
        setPlans(data.plans);
        setTrialDays(data.trialDays);
      } catch (error) {
        console.error("Error fetching plans:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleSelectPlan = (codename: string) => {
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

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-10">
        <div className="text-center mb-10">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[500px]" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Escolha seu plano</h1>
        <p className="text-muted-foreground text-lg">
          Comece com {trialDays} dias grátis. Cancele a qualquer momento.
        </p>
      </div>

      {/* Billing Toggle */}
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
              >
                Começar trial grátis
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
                Mais popular
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
              >
                Começar trial grátis
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Trial Info */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Seu cartão será salvo mas você só será cobrado após {trialDays} dias.
          <br />
          Cancele a qualquer momento durante o trial sem nenhuma cobrança.
        </p>
      </div>
    </div>
  );
}
