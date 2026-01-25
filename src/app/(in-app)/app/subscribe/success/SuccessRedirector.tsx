"use client";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

export default function SuccessRedirector() {
  const router = useRouter();
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/app/me");
      if (response.ok) {
        const data = await response.json();
        console.log("[SuccessRedirector] Checking subscription status:", {
          stripeSubscriptionId: data.user?.stripeSubscriptionId,
          planId: data.user?.planId,
        });

        if (data.user?.stripeSubscriptionId) {
          console.log("[SuccessRedirector] Subscription is active!");
          setIsSubscriptionActive(true);
          setIsChecking(false);
          // Redirect immediately when subscription is active
          router.push("/app");
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("[SuccessRedirector] Error checking subscription:", error);
      return false;
    }
  }, [router]);

  useEffect(() => {
    // Initial check
    checkSubscriptionStatus();

    // Poll every 2 seconds for up to 30 attempts (1 minute)
    const pollInterval = setInterval(async () => {
      setPollCount((prev) => {
        const newCount = prev + 1;
        console.log(`[SuccessRedirector] Poll attempt ${newCount}/30`);

        if (newCount >= 30) {
          console.log("[SuccessRedirector] Max poll attempts reached");
          setIsChecking(false);
          clearInterval(pollInterval);
        }
        return newCount;
      });

      const isActive = await checkSubscriptionStatus();
      if (isActive) {
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [checkSubscriptionStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="p-8 max-w-lg w-full">
        <div className="flex flex-col items-center text-center space-y-4">
          {isChecking ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <h1 className="text-2xl font-bold">Ativando sua assinatura...</h1>
              <p className="text-muted-foreground">
                Aguarde enquanto processamos seu pagamento. Isso pode levar alguns segundos.
              </p>
              <p className="text-muted-foreground text-sm">
                Verificação {pollCount}/30
              </p>
            </>
          ) : isSubscriptionActive ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="text-2xl font-bold">Assinatura ativada!</h1>
              <p className="text-muted-foreground">
                Seu pagamento foi processado com sucesso. Redirecionando...
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h1 className="text-2xl font-bold">Pagamento recebido!</h1>
              <p className="text-muted-foreground">
                Seu pagamento foi processado. A ativação da assinatura pode levar alguns minutos.
              </p>
              <p className="text-muted-foreground text-sm">
                Se sua assinatura não for ativada em breve, entre em contato com o suporte.
              </p>
              <div className="flex flex-row gap-2 items-center pt-4">
                <Button asChild>
                  <Link href="/app">Ir para o app</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/app/settings">Ver configurações</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
