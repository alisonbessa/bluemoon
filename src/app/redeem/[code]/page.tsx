"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Gift,
  User,
  Users,
  Check,
  AlertCircle,
  Loader2,
  LogIn,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { appConfig } from "@/shared/lib/config";

type PlanType = "solo" | "duo";

interface CodeValidation {
  valid: boolean;
  type?: "lifetime" | "beta";
  error?: string;
}

export default function RedeemPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isValidating, setIsValidating] = useState(true);
  const [validation, setValidation] = useState<CodeValidation | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Normalize code for display
  const normalizedCode = code.toUpperCase().replace(/-/g, "").match(/.{1,4}/g)?.join("-") || code;

  useEffect(() => {
    async function validateCode() {
      try {
        const response = await fetch(`/api/access-link/${code}`);
        const data = await response.json();

        if (!response.ok) {
          setValidation({ valid: false, error: data.error });
        } else {
          setValidation({ valid: true, type: data.type });
        }
      } catch {
        setValidation({ valid: false, error: "Erro ao validar código" });
      } finally {
        setIsValidating(false);
      }
    }

    validateCode();
  }, [code]);

  const handleRedeem = async () => {
    if (!selectedPlan) {
      toast.error("Selecione um plano");
      return;
    }

    setIsRedeeming(true);
    try {
      const response = await fetch("/api/app/redeem-access-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalizedCode,
          planType: selectedPlan,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Falha ao resgatar código");
        return;
      }

      toast.success(data.message);
      router.push("/app");
    } catch {
      toast.error("Erro ao resgatar código");
    } finally {
      setIsRedeeming(false);
    }
  };

  // Not logged in
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Resgate seu Código</CardTitle>
            <CardDescription>
              Faça login para resgatar seu código de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <code className="text-lg font-mono font-bold">{normalizedCode}</code>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full" size="lg">
              <Link href={`/sign-in?callbackUrl=/redeem/${code}`}>
                <LogIn className="mr-2 h-4 w-4" />
                Entrar para Resgatar
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Não tem conta?{" "}
              <Link href={`/sign-up?callbackUrl=/redeem/${code}`} className="text-primary hover:underline">
                Cadastre-se
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading session
  if (status === "loading" || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid code
  if (!validation?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-destructive/10 rounded-full w-fit">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Código Inválido</CardTitle>
            <CardDescription>
              {validation?.error || "Este código não é válido ou já foi utilizado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <code className="text-lg font-mono line-through text-muted-foreground">
                {normalizedCode}
              </code>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" className="w-full">
              <Link href="/app">Ir para o App</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Valid code - show plan selection
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {validation.type === "lifetime" ? "Acesso Vitalício" : "Acesso Beta"}
          </h1>
          <p className="text-muted-foreground">
            Escolha seu plano para ativar o código
          </p>
          <div className="mt-4 inline-block p-3 bg-muted rounded-lg">
            <code className="text-lg font-mono font-bold">{normalizedCode}</code>
          </div>
        </div>

        {/* Plan Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Solo Plan */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedPlan === "solo"
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedPlan("solo")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Solo</CardTitle>
                </div>
                {selectedPlan === "solo" && (
                  <div className="p-1 bg-primary rounded-full">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardDescription>
                Para gerenciar suas finanças pessoais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>1 pessoa no orçamento</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Todas as funcionalidades</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Duo Plan */}
          <Card
            className={`cursor-pointer transition-all ${
              selectedPlan === "duo"
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedPlan("duo")}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Duo</CardTitle>
                </div>
                {selectedPlan === "duo" && (
                  <div className="p-1 bg-primary rounded-full">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardDescription>
                Para casais que compartilham finanças
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>2 pessoas no orçamento</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Convide seu parceiro(a)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Suporte prioritário</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Redeem Button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="w-full max-w-md"
            disabled={!selectedPlan || isRedeeming}
            onClick={handleRedeem}
          >
            {isRedeeming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Ativar {validation.type === "lifetime" ? "Acesso Vitalício" : "Acesso Beta"}
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Logado como {session?.user?.email}
          </p>
        </div>
      </div>
    </div>
  );
}
