"use client";

import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { Skeleton } from "@/shared/ui/skeleton";
import { LoadingState } from "@/shared/molecules/loading-state";
import { EmptyState } from "@/shared/molecules/empty-state";
import { Inbox } from "lucide-react";
import { PageHeading, Showcase } from "../_components/showcase";

export default function FeedbackPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="Feedback"
        description="Estados visuais para sucesso, erro, carregamento e vazio."
      />

      <Showcase title="Alert">
        <div className="space-y-3">
          <Alert>
            <Info />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              Variante padrão. Use para informações neutras.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <XCircle />
            <AlertTitle>Algo deu errado</AlertTitle>
            <AlertDescription>
              Não foi possível salvar suas alterações.
            </AlertDescription>
          </Alert>
        </div>
      </Showcase>

      <Showcase title="Toast (sonner)" description="Toaster está montado em Providers.tsx.">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast("Mensagem padrão")}>Default</Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Tudo certo!", {
                icon: <CheckCircle2 className="size-4" />,
              })
            }
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.warning("Atenção!", {
                icon: <AlertTriangle className="size-4" />,
              })
            }
          >
            Warning
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("Algo falhou", { description: "Tente novamente." })}
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(
                new Promise((resolve) => setTimeout(resolve, 1500)),
                {
                  loading: "Salvando...",
                  success: "Salvo!",
                  error: "Erro ao salvar",
                }
              )
            }
          >
            Promise
          </Button>
        </div>
      </Showcase>

      <Showcase title="Progress">
        <div className="space-y-3">
          <Progress value={20} />
          <Progress value={55} />
          <Progress value={88} />
        </div>
      </Showcase>

      <Showcase title="Skeleton">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </Showcase>

      <Showcase title="LoadingState (molecule)">
        <LoadingState height="200px" text="Carregando dados..." />
      </Showcase>

      <Showcase title="EmptyState (molecule)">
        <EmptyState
          icon={<Inbox className="size-5 text-muted-foreground" />}
          title="Nenhum item ainda"
          description="Quando você criar algo, vai aparecer aqui."
          action={{
            label: "Criar item",
            onClick: () => toast("Ação primária"),
          }}
          secondaryAction={{
            label: "Saiba mais",
            onClick: () => toast("Ação secundária"),
          }}
        />
      </Showcase>
    </div>
  );
}
