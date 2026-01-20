"use client";

import { useState, useEffect, use } from "react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  LogIn,
  Home,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface InviteInfo {
  id: string;
  email: string;
  name: string | null;
  status: "pending" | "accepted" | "expired" | "cancelled";
  expiresAt: string;
  budget: {
    id: string;
    name: string;
  };
  invitedBy: {
    name: string | null;
    email: string | null;
  };
}

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [acceptResult, setAcceptResult] = useState<{
    success: boolean;
    budgetId?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        // First check if user is authenticated
        const authRes = await fetch("/api/auth/session");
        const authData = await authRes.json();
        setIsAuthenticated(!!authData?.user);

        // Fetch invite info
        const response = await fetch(`/api/invite/${token}`);
        const data = await response.json();

        if (response.ok) {
          setInvite(data.invite);
        } else {
          setError(data.error || "Convite não encontrado");
        }
      } catch (err) {
        console.error("Error fetching invite:", err);
        setError("Erro ao carregar convite");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAcceptInvite = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch("/api/app/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setAcceptResult({ success: true, budgetId: data.budgetId });
        toast.success("Convite aceito com sucesso!");
      } else {
        setAcceptResult({ success: false, error: data.error });
        if (data.error === "This invite was sent to a different email address") {
          toast.error(`Este convite foi enviado para ${data.inviteEmail}`);
        } else {
          toast.error(data.error || "Erro ao aceitar convite");
        }
      }
    } catch (err) {
      console.error("Error accepting invite:", err);
      setAcceptResult({ success: false, error: "Erro ao aceitar convite" });
      toast.error("Erro ao aceitar convite");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Voltar para o início
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  const isExpired =
    invite.status === "expired" || new Date(invite.expiresAt) < new Date();
  const isAlreadyAccepted = invite.status === "accepted";
  const isCancelled = invite.status === "cancelled";

  // Show success state
  if (acceptResult?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Bem-vindo(a) ao orçamento!</CardTitle>
            <CardDescription>
              Você agora faz parte do orçamento "{invite.budget.name}"
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push("/app")}>
              <Home className="mr-2 h-4 w-4" />
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state from accept attempt
  if (acceptResult?.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Erro ao aceitar convite</CardTitle>
            <CardDescription>{acceptResult.error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Se você está usando uma conta diferente, faça logout e entre com o
              email correto.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" asChild>
                <Link href="/">Voltar</Link>
              </Button>
              <Button onClick={() => router.push("/sign-in")}>
                Fazer login com outro email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {isExpired || isCancelled ? (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle>
                {isCancelled ? "Convite Cancelado" : "Convite Expirado"}
              </CardTitle>
              <CardDescription>
                {isCancelled
                  ? "Este convite foi cancelado pelo dono do orçamento."
                  : "Este convite não é mais válido. Peça um novo convite."}
              </CardDescription>
            </>
          ) : isAlreadyAccepted ? (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Convite já aceito</CardTitle>
              <CardDescription>
                Você já faz parte do orçamento "{invite.budget.name}"
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Você foi convidado(a)!</CardTitle>
              <CardDescription>
                {invite.invitedBy.name || invite.invitedBy.email} convidou você
                para participar do orçamento
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {/* Budget Info */}
          <div className="rounded-lg border bg-muted/50 p-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Orçamento</p>
              <p className="text-lg font-semibold">{invite.budget.name}</p>
            </div>
          </div>

          {/* Actions */}
          {isExpired || isCancelled || isAlreadyAccepted ? (
            <div className="text-center">
              <Button asChild>
                <Link href={isAlreadyAccepted ? "/app" : "/"}>
                  <Home className="mr-2 h-4 w-4" />
                  {isAlreadyAccepted ? "Ir para o Dashboard" : "Voltar para o início"}
                </Link>
              </Button>
            </div>
          ) : isAuthenticated === false ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                {invite.email ? (
                  <>
                    Para aceitar o convite, você precisa estar logado com o email{" "}
                    <strong>{invite.email}</strong>
                  </>
                ) : (
                  "Para aceitar o convite, você precisa estar logado"
                )}
              </p>
              <Button
                className="w-full"
                onClick={() =>
                  router.push(`/sign-in?callbackUrl=/invite/${token}`)
                }
              >
                <LogIn className="mr-2 h-4 w-4" />
                Fazer login
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Não tem uma conta?{" "}
                <Link
                  href={`/sign-up?callbackUrl=/invite/${token}${invite.email ? `&email=${encodeURIComponent(invite.email)}` : ""}`}
                  className="text-primary hover:underline"
                >
                  Criar conta
                </Link>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Ao aceitar, você terá acesso completo ao orçamento compartilhado
                e poderá adicionar transações.
              </p>
              <Button
                className="w-full"
                onClick={handleAcceptInvite}
                disabled={isAccepting}
              >
                {isAccepting ? "Aceitando..." : "Aceitar Convite"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
