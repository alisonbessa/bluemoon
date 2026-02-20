import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Lista de Espera - Confirmação",
  description: "Inscrição na lista de espera confirmada com sucesso.",
};

export default function WaitlistSuccessPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="container max-w-md px-4 py-16 text-center">
        <div className="mb-6 flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Você está na lista!</h1>
        <p className="mb-8 text-muted-foreground">
          Obrigado por se inscrever. Avisaremos por email quando a plataforma estiver pronta.
        </p>
        <Button asChild>
          <Link href="/">Voltar ao Início</Link>
        </Button>
      </div>
    </div>
  );
}
