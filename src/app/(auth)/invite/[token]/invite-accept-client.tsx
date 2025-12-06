"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  LogIn,
  UserPlus,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface InviteAcceptClientProps {
  token: string;
  error?: string;
  invite?: {
    id: string;
    email: string | null;
    name: string | null;
    expiresAt: string;
  };
  budget?: {
    id: string;
    name: string;
    currency: string;
    memberCount: number;
    memberNames: string[];
  };
  invitedBy?: {
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  isLoggedIn: boolean;
  canAccept?: boolean;
  emailMismatch?: boolean;
  alreadyMember?: boolean;
  currentUserEmail?: string | null;
}

export function InviteAcceptClient({
  token,
  error,
  invite,
  budget,
  invitedBy,
  isLoggedIn,
  canAccept = true,
  emailMismatch = false,
  alreadyMember = false,
  currentUserEmail,
}: InviteAcceptClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAcceptInvite = async () => {
    setIsAccepting(true);

    try {
      const response = await fetch("/api/app/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao aceitar convite");
      }

      toast.success("Convite aceito com sucesso!");
      router.push("/app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aceitar convite");
    } finally {
      setIsAccepting(false);
    }
  };

  // Error states
  if (error) {
    const errorContent = {
      INVITE_NOT_FOUND: {
        icon: XCircle,
        title: "Convite não encontrado",
        description: "Este link de convite não existe ou foi removido.",
        color: "text-destructive",
      },
      INVITE_EXPIRED: {
        icon: Clock,
        title: "Convite expirado",
        description: "Este convite expirou. Peça um novo convite para o organizador do orçamento.",
        color: "text-amber-500",
      },
      INVITE_ACCEPTED: {
        icon: CheckCircle2,
        title: "Convite já utilizado",
        description: "Este convite já foi aceito anteriormente.",
        color: "text-green-500",
      },
      INVITE_CANCELLED: {
        icon: XCircle,
        title: "Convite cancelado",
        description: "Este convite foi cancelado pelo organizador.",
        color: "text-destructive",
      },
    }[error] || {
      icon: AlertCircle,
      title: "Erro",
      description: "Ocorreu um erro ao carregar o convite.",
      color: "text-destructive",
    };

    const Icon = errorContent.icon;

    return (
      <div className="text-center space-y-6">
        <div className={`flex justify-center ${errorContent.color}`}>
          <Icon className="h-16 w-16" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            {errorContent.title}
          </h1>
          <p className="text-muted-foreground">
            {errorContent.description}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {isLoggedIn ? (
            <Button asChild>
              <Link href="/app">Ir para o Dashboard</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/sign-in">Fazer Login</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Valid invite
  if (!invite || !budget) {
    return null;
  }

  const expiresAt = new Date(invite.expiresAt);
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            {invitedBy?.image && (
              <Avatar className="absolute -bottom-1 -right-1 h-8 w-8 border-2 border-background">
                <AvatarImage src={invitedBy.image} />
                <AvatarFallback>
                  {invitedBy.name?.[0] || invitedBy.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Você foi convidado!
        </h1>
        <p className="text-muted-foreground">
          {invitedBy?.name || invitedBy?.email} te convidou para compartilhar um orçamento
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{budget.name}</CardTitle>
          <CardDescription>
            {budget.memberCount} {budget.memberCount === 1 ? "membro" : "membros"} atualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {budget.memberNames.map((name, i) => (
              <Badge key={i} variant="secondary">
                {name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <Clock className="inline-block h-4 w-4 mr-1" />
        Este convite expira em {daysUntilExpiry} {daysUntilExpiry === 1 ? "dia" : "dias"}
      </div>

      {alreadyMember && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Você já é membro deste orçamento! Acesse o dashboard para gerenciar suas finanças.
          </AlertDescription>
        </Alert>
      )}

      {emailMismatch && invite.email && !alreadyMember && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este convite foi enviado para <strong>{invite.email}</strong>, mas você está
            logado como <strong>{currentUserEmail}</strong>. Faça login com o email correto
            para aceitar este convite.
          </AlertDescription>
        </Alert>
      )}

      {isLoggedIn ? (
        <div className="space-y-3">
          {alreadyMember ? (
            <Button className="w-full" size="lg" asChild>
              <Link href="/app">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Ir para o Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button
                className="w-full"
                size="lg"
                onClick={handleAcceptInvite}
                disabled={isAccepting || !canAccept}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aceitando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aceitar Convite
                  </>
                )}
              </Button>
              {emailMismatch && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/sign-in?callbackUrl=/invite/${token}`}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Entrar com outra conta
                  </Link>
                </Button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Button className="w-full" size="lg" asChild>
            <Link href={`/sign-in?callbackUrl=/invite/${token}`}>
              <LogIn className="mr-2 h-4 w-4" />
              Fazer Login para Aceitar
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/sign-up?callbackUrl=/invite/${token}`}>
              <UserPlus className="mr-2 h-4 w-4" />
              Criar Conta
            </Link>
          </Button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Ao aceitar, você terá acesso completo ao orçamento compartilhado
        e poderá visualizar e criar transações.
      </p>
    </div>
  );
}
