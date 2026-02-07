"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { Database, AlertTriangle, Trash2, Users, Wand2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { toast } from "sonner";

const CONFIRMATION_CODE = "RESET_ALL_DATA";

const TABLES_TO_DELETE = [
  { name: "transactions", description: "Transações financeiras" },
  { name: "monthly_allocations", description: "Alocações de categorias" },
  { name: "monthly_income_allocations", description: "Alocações de renda" },
  { name: "monthly_budget_status", description: "Status mensal" },
  { name: "recurring_bills", description: "Contas recorrentes" },
  { name: "income_sources", description: "Fontes de renda" },
  { name: "goals", description: "Metas de economia" },
  { name: "categories", description: "Categorias" },
  { name: "financial_accounts", description: "Contas bancárias" },
  { name: "budget_members", description: "Membros do orçamento" },
  { name: "invites", description: "Convites pendentes" },
  { name: "budgets", description: "Orçamentos" },
  { name: "groups", description: "Grupos de categorias" },
  { name: "telegram_users", description: "Conexões Telegram" },
  { name: "telegram_ai_logs", description: "Logs de IA" },
  { name: "telegram_pending_connections", description: "Conexões pendentes" },
  { name: "access_links", description: "Links de acesso" },
];

const USER_TABLES = [
  { name: "users", description: "Contas de usuários" },
  { name: "credits", description: "Saldo de créditos" },
  { name: "credit_transactions", description: "Histórico de créditos" },
  { name: "coupons", description: "Cupons lifetime" },
  { name: "sessions", description: "Sessões ativas" },
  { name: "accounts", description: "Contas OAuth" },
  { name: "verification_tokens", description: "Tokens de verificação" },
];

const TABLES_ALWAYS_PRESERVED = [
  { name: "plans", description: "Planos de assinatura" },
  { name: "contact_messages", description: "Mensagens de contato" },
  { name: "waitlist", description: "Lista de espera" },
];

export default function DatabasePage() {
  const [confirmation, setConfirmation] = useState("");
  const [includeUsers, setIncludeUsers] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [mockDataEmail, setMockDataEmail] = useState("");
  const [isPopulating, setIsPopulating] = useState(false);

  const handlePopulateMockData = async () => {
    if (!mockDataEmail) {
      toast.error("Digite um email válido");
      return;
    }

    setIsPopulating(true);
    try {
      const response = await fetch("/api/super-admin/mock-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: mockDataEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha ao popular dados");
      }

      toast.success(data.message || "Dados de teste criados com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao popular dados");
      console.error(error);
    } finally {
      setIsPopulating(false);
    }
  };

  const handleReset = async () => {
    if (confirmation !== CONFIRMATION_CODE) {
      toast.error("Código de confirmação inválido");
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch("/api/super-admin/database/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode: confirmation, includeUsers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Falha ao resetar banco de dados");
      }

      toast.success(
        includeUsers
          ? "Reset completo realizado (incluindo usuários)"
          : "Reset realizado (usuários preservados)"
      );
      setConfirmation("");
      setIncludeUsers(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao resetar banco de dados");
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden">
      <div className="flex items-center gap-4">
        <Database className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Gerenciamento de Banco</h1>
          <p className="text-muted-foreground text-sm">
            Gerenciar e resetar dados da aplicação
          </p>
        </div>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Zona de Perigo</AlertTitle>
        <AlertDescription>
          Operações nesta página são destrutivas e não podem ser desfeitas.
          Certifique-se de ter um backup antes de prosseguir.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Tabelas sempre deletadas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-destructive text-base">
              <Trash2 className="h-5 w-5 shrink-0" />
              Sempre Deletado
            </CardTitle>
            <CardDescription className="text-xs">
              Dados do HiveBudget (orçamentos, transações, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
              {TABLES_TO_DELETE.map((table) => (
                <li key={table.name} className="flex flex-col gap-0.5">
                  <code className="bg-destructive/10 px-1.5 py-0.5 rounded text-destructive text-xs w-fit">
                    {table.name}
                  </code>
                  <span className="text-muted-foreground text-xs pl-1">{table.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Tabelas de usuários (opcional) */}
        <Card className={includeUsers ? "border-destructive" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className={`flex items-center gap-2 text-base ${includeUsers ? "text-destructive" : "text-amber-600"}`}>
              <Users className="h-5 w-5 shrink-0" />
              <span className="truncate">
                Dados de Usuários {includeUsers ? "(Será Deletado)" : "(Opcional)"}
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              {includeUsers ? "Será deletado com checkbox ativado" : "Ative checkbox para deletar usuários"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {USER_TABLES.map((table) => (
                <li key={table.name} className="flex flex-col gap-0.5">
                  <code className={`px-1.5 py-0.5 rounded text-xs w-fit ${includeUsers ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
                    {table.name}
                  </code>
                  <span className="text-muted-foreground text-xs pl-1">{table.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Tabelas sempre preservadas */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-600 text-base">
              <Database className="h-5 w-5 shrink-0" />
              Sempre Preservado
            </CardTitle>
            <CardDescription className="text-xs">
              Config do sistema (planos, waitlist, mensagens)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {TABLES_ALWAYS_PRESERVED.map((table) => (
                <li key={table.name} className="flex flex-col gap-0.5">
                  <code className="bg-green-500/10 px-1.5 py-0.5 rounded text-green-600 text-xs w-fit">
                    {table.name}
                  </code>
                  <span className="text-muted-foreground text-xs pl-1">{table.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Popular Dados de Teste */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Wand2 className="h-5 w-5" />
            Popular Dados de Teste
          </CardTitle>
          <CardDescription>
            Cria um orçamento completo com contas, categorias, transações e metas para o usuário especificado.
            O usuário receberá o plano Duo com role &quot;lifetime&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Email do usuário:</p>
            <Input
              type="email"
              value={mockDataEmail}
              onChange={(e) => setMockDataEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="max-w-md"
            />
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Serão criados:</p>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li>1 orçamento com 2 membros (owner + parceiro)</li>
              <li>7 contas (Nubank, Inter, Poupança, 2 cartões, Dinheiro, VR)</li>
              <li>4 fontes de renda (2 salários, freelance, VR)</li>
              <li>17 categorias em todos os grupos</li>
              <li>3 metas de economia</li>
              <li>Transações dos últimos 3 meses</li>
              <li>Alocações mensais para categorias e rendas</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handlePopulateMockData}
            disabled={isPopulating || !mockDataEmail}
            className="w-full sm:w-auto"
          >
            {isPopulating ? (
              <>Criando dados...</>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Popular Dados de Teste
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Formulário de Reset */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Resetar Todos os Dados</CardTitle>
          <CardDescription>
            Isso irá deletar todos os dados do HiveBudget incluindo orçamentos, transações,
            categorias, contas e mais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Checkbox para incluir usuários */}
          <div className="flex items-start space-x-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
            <Checkbox
              id="includeUsers"
              checked={includeUsers}
              onCheckedChange={(checked) => setIncludeUsers(checked === true)}
            />
            <div className="grid gap-1.5 leading-none min-w-0">
              <Label
                htmlFor="includeUsers"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Deletar contas de usuários também
              </Label>
              <p className="text-xs text-muted-foreground">
                Isso irá remover todos os usuários, créditos, cupons e sessões.
                Apenas planos e config do sistema permanecerão.
              </p>
            </div>
          </div>

          {/* Código de confirmação */}
          <div>
            <p className="text-sm font-medium mb-2">
              Para confirmar, digite <code className="bg-muted px-1 rounded">{CONFIRMATION_CODE}</code> abaixo:
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_CODE}
              className="max-w-md font-mono"
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting || confirmation !== CONFIRMATION_CODE}
            className="w-full sm:w-auto"
          >
            {isResetting ? (
              <>Resetando...</>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {includeUsers ? "Resetar Tudo" : "Resetar Banco"}
              </>
            )}
          </Button>
          {includeUsers && (
            <span className="text-xs text-destructive">
              Atenção: Isso irá deletar TODOS os usuários!
            </span>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
