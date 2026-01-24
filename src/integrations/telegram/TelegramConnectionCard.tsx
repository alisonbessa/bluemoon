"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Send, ExternalLink, Loader2, Unlink, CheckCircle2, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ConnectionStatus {
  connected: boolean;
  username?: string;
  firstName?: string;
  code?: string;
  botUsername?: string;
  deepLink?: string;
  expiresAt?: string;
}

export function TelegramConnectionCard() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/telegram/connect-link");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Error fetching Telegram status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/telegram/connect-link", {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Telegram desconectado com sucesso!");
        setStatus({ connected: false });
        // Fetch new link
        fetchStatus();
      } else {
        toast.error("Erro ao desconectar Telegram");
      }
    } catch (error) {
      toast.error("Erro ao desconectar Telegram");
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  const handleRefreshLink = async () => {
    setIsLoading(true);
    await fetchStatus();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Telegram</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Telegram</CardTitle>
            </div>
            {status?.connected && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </Badge>
            )}
          </div>
          <CardDescription>
            Registre seus gastos rapidamente pelo Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.connected ? (
            // Connected state
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm">
                  Conectado como: <strong>@{status.username || status.firstName || "Usuário"}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Envie valores diretamente no chat do bot para registrar gastos.
                </p>
              </div>

              <div className="rounded-lg border border-dashed p-3">
                <p className="text-sm font-medium mb-2">Como usar:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Envie <code className="bg-muted px-1 rounded">50</code> para registrar R$ 50,00</li>
                  <li>• Envie <code className="bg-muted px-1 rounded">35,90 almoço</code> com descrição</li>
                  <li>• Use <code className="bg-muted px-1 rounded">/ajuda</code> para ver comandos</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowDisconnectDialog(true)}
              >
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar Telegram
              </Button>
            </div>
          ) : (
            // Not connected state
            <div className="space-y-4">
              {status?.code ? (
                <>
                  {/* Verification Code Display */}
                  <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-2">Seu código de conexão:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-3xl font-bold tracking-widest text-primary">
                        {status.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          navigator.clipboard.writeText(status.code!);
                          toast.success("Código copiado!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Expira em 10 minutos
                    </p>
                  </div>

                  {/* Instructions */}
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <h4 className="font-medium mb-2">Como conectar:</h4>
                    <ol className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          1
                        </span>
                        <span>
                          Abra o bot{" "}
                          <a
                            href={status.deepLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium hover:underline"
                          >
                            @{status.botUsername}
                          </a>{" "}
                          no Telegram
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          2
                        </span>
                        <span>
                          Envie o código <strong>{status.code}</strong> no chat
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                          3
                        </span>
                        <span>Pronto! Sua conta será conectada</span>
                      </li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Button asChild className="flex-1 gap-2">
                      <a
                        href={status.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Send className="h-4 w-4" />
                        Abrir Telegram
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRefreshLink}
                      disabled={isLoading}
                      title="Gerar novo código"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={handleRefreshLink}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Gerar código de conexão
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Telegram?</AlertDialogTitle>
            <AlertDialogDescription>
              Você não poderá mais registrar gastos pelo Telegram até conectar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="mr-2 h-4 w-4" />
              )}
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
