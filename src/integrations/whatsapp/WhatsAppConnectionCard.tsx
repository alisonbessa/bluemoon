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
import { MessageCircle, ExternalLink, Loader2, Unlink, CheckCircle2, RefreshCw, Smartphone, QrCode } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface ConnectionStatus {
  connected: boolean;
  phoneNumber?: string;
  displayName?: string;
  code?: string;
  whatsappNumber?: string;
  deepLink?: string;
  expiresAt?: string;
}

export function WhatsAppConnectionCard() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/connect-link");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
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
      const res = await fetch("/api/whatsapp/connect-link", {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("WhatsApp desconectado com sucesso!");
        setStatus({ connected: false });
        fetchStatus();
      } else {
        toast.error("Erro ao desconectar WhatsApp");
      }
    } catch {
      toast.error("Erro ao desconectar WhatsApp");
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  const handleRefreshLink = async () => {
    setIsLoading(true);
    await fetchStatus();
  };

  // Format phone number for display (e.g., 5511999998888 -> +55 11 99999-8888)
  const formatPhone = (phone?: string) => {
    if (!phone) return "Usuário";
    if (phone.length === 13) {
      return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  // Build deep link with pre-filled message containing the code
  const getDeepLinkWithCode = () => {
    if (!status?.whatsappNumber || !status?.code) return "";
    const message = encodeURIComponent(`Olá! Meu código para o HiveBudget é: ${status.code}`);
    return `https://wa.me/${status.whatsappNumber}?text=${message}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <CardTitle>WhatsApp</CardTitle>
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
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <CardTitle>WhatsApp</CardTitle>
            </div>
            {status?.connected && (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </Badge>
            )}
          </div>
          <CardDescription>
            Registre seus gastos rapidamente pelo WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.connected ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm">
                  Conectado como: <strong>{status.displayName || formatPhone(status.phoneNumber)}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Envie valores diretamente no chat para registrar gastos.
                </p>
              </div>

              <div className="rounded-lg border border-dashed p-3">
                <p className="text-sm font-medium mb-2">Como usar:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Envie <code className="bg-muted px-1 rounded">50</code> para registrar R$ 50,00</li>
                  <li>• Envie <code className="bg-muted px-1 rounded">35,90 almoço</code> com descrição</li>
                  <li>• Envie <code className="bg-muted px-1 rounded">ajuda</code> para ver comandos</li>
                </ul>
              </div>

              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={() => setShowDisconnectDialog(true)}
              >
                <Unlink className="mr-2 h-4 w-4" />
                Desconectar WhatsApp
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {status?.code ? (
                <>
                  {/* QR Code for desktop - hidden on mobile */}
                  <div className="hidden sm:block">
                    <div className="rounded-lg border-2 border-primary/20 bg-white p-4 flex flex-col items-center gap-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <QrCode className="h-4 w-4" />
                        <p className="text-xs font-medium">Escaneie com seu celular</p>
                      </div>
                      <QRCodeSVG
                        value={getDeepLinkWithCode()}
                        size={180}
                        level="M"
                        marginSize={2}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Aponte a câmera do celular e toque em <strong>Enviar</strong> no WhatsApp
                      </p>
                    </div>
                  </div>

                  {/* Mobile button - hidden on desktop */}
                  <div className="sm:hidden">
                    <Button asChild className="w-full gap-2" size="lg">
                      <a href={getDeepLinkWithCode()}>
                        <MessageCircle className="h-5 w-5" />
                        Conectar pelo WhatsApp
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Toque no botão e envie a mensagem no WhatsApp
                    </p>
                  </div>

                  {/* Desktop fallback link */}
                  <div className="hidden sm:flex gap-2">
                    <Button asChild variant="outline" className="flex-1 gap-2">
                      <a
                        href={getDeepLinkWithCode()}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Smartphone className="h-4 w-4" />
                        Abrir no WhatsApp Web
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

                  {/* Info */}
                  <p className="text-xs text-muted-foreground text-center">
                    Código expira em 10 minutos
                  </p>
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
                    <MessageCircle className="h-4 w-4" />
                  )}
                  Conectar WhatsApp
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Você não poderá mais registrar gastos pelo WhatsApp até conectar novamente.
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
