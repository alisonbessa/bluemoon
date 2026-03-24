"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  ArrowRight,
  Check,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";
import { formatAmount } from "@/shared/lib/formatters";

interface StepQuickStartProps {
  totalIncomeCents: number;
  categoriesCount: number;
  isDuo: boolean;
  privacyLabel?: string;
  onGoToDashboard: () => void;
}

export function StepQuickStart({
  totalIncomeCents,
  categoriesCount,
  isDuo,
  privacyLabel,
  onGoToDashboard,
}: StepQuickStartProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold mb-2">
          Tudo pronto!
        </h2>
        <p className="text-muted-foreground">
          Seu orçamento está configurado e pronto para usar.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Renda total</span>
          <span className="font-medium">R$ {formatAmount(totalIncomeCents)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Categorias</span>
          <span className="font-medium">{categoriesCount} configuradas</span>
        </div>
        {isDuo && privacyLabel && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Privacidade</span>
            <span className="font-medium">{privacyLabel}</span>
          </div>
        )}
      </div>

      {/* Quick wins */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Dicas para começar:
        </p>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Plus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Registre seu primeiro gasto</p>
              <p className="text-xs text-muted-foreground">
                Use o botão &quot;+ Nova Transação&quot; no menu ou Ctrl+N.
                Leva menos de 10 segundos.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Conecte o WhatsApp</p>
              <p className="text-xs text-muted-foreground">
                Registre gastos por mensagem — é o jeito mais rápido.
                Configure em Configurações.
              </p>
            </div>
          </CardContent>
        </Card>

        {isDuo && (
          <Card>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Convide seu parceiro(a)</p>
                <p className="text-xs text-muted-foreground">
                  O app fica melhor a dois. Envie o convite em Configurações.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Button size="lg" className="w-full" onClick={onGoToDashboard}>
        Ir para o Dashboard
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
