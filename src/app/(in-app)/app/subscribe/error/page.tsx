import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { XCircle } from "lucide-react";
import Link from "next/link";

type ErrorCodeType =
  | "STRIPE_CANCEL_BEFORE_SUBSCRIBING"
  | "LEMON_SQUEEZY_CANCEL_BEFORE_SUBSCRIBING"
  | "DODO_CANCEL_BEFORE_SUBSCRIBING"
  | "DODO_MISSING_BILLING_INFO"
  | "PAYPAL_CANCELLED"
  | "INVALID_PARAMS";

type ErrorMessages = {
  [key in ErrorCodeType]?: string;
};

const errorMessages: ErrorMessages = {
  STRIPE_CANCEL_BEFORE_SUBSCRIBING:
    "Cancele sua assinatura atual antes de assinar um novo plano.",
  LEMON_SQUEEZY_CANCEL_BEFORE_SUBSCRIBING:
    "Cancele sua assinatura atual antes de assinar um novo plano.",
  DODO_CANCEL_BEFORE_SUBSCRIBING:
    "Cancele sua assinatura atual antes de assinar um novo plano.",
  DODO_MISSING_BILLING_INFO:
    "Informações de pagamento são necessárias para completar sua assinatura.",
  PAYPAL_CANCELLED: "Assinatura PayPal cancelada.",
  INVALID_PARAMS: "Parâmetros inválidos.",
};

export default async function SubscribeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const { code, message: errorMessage } = await searchParams;
  const message = code
    ? errorMessages[code as ErrorCodeType] || errorMessage
    : errorMessage || "Ocorreu um erro durante a assinatura.";

  return (
    <div className="container max-w-lg mx-auto py-12">
      <Card className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <XCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Erro na Assinatura</h1>
          <p className="text-muted-foreground">{message}</p>
          {code === "STRIPE_CANCEL_BEFORE_SUBSCRIBING" && (
            <div className="flex flex-col gap-2 items-center">
              <p>
                Se deseja cancelar sua assinatura atual, acesse a página de cobrança.
              </p>
              <Button asChild>
                <Link href="/app/billing">Ir para Cobrança</Link>
              </Button>
            </div>
          )}
          {code === "LEMON_SQUEEZY_CANCEL_BEFORE_SUBSCRIBING" && (
            <div className="flex flex-col gap-2 items-center">
              <p>
                Se deseja cancelar sua assinatura atual, acesse a página de cobrança.
              </p>
              <Button asChild>
                <Link href="/app/billing">Ir para Cobrança</Link>
              </Button>
            </div>
          )}
          {code === "DODO_CANCEL_BEFORE_SUBSCRIBING" && (
            <div className="flex flex-col gap-2 items-center">
              <p>
                Se deseja cancelar sua assinatura atual, acesse a página de cobrança.
              </p>
              <Button asChild>
                <Link href="/app/billing">Ir para Cobrança</Link>
              </Button>
            </div>
          )}
          {code === "DODO_MISSING_BILLING_INFO" && (
            <div className="flex flex-col gap-2 items-center">
              <p>
                Forneça suas informações de pagamento para completar a assinatura.
              </p>
              <Button asChild>
                <Link href="/app/subscribe">Tentar Novamente</Link>
              </Button>
            </div>
          )}
          {code === "PAYPAL_CANCELLED" && (
            <div className="flex flex-col gap-2 items-center">
              <p>
                 Assinatura PayPal cancelada. Tente novamente.
              </p>
            </div>
          )}
          {/* Contact Support */}
          <div className="flex flex-row gap-2 items-center">
            <Button variant="outline" asChild>
              <Link href="/contact">Fale com o Suporte</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Voltar ao Início</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
