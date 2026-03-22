"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  Loader2,
  Play,
  XCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface MigrationResult {
  email: string;
  status: "migrated" | "stripe_error" | "email_error";
  error?: string;
}

interface MigrationResponse {
  success: boolean;
  total: number;
  migrated: number;
  errors: number;
  results: MigrationResult[];
}

interface Migration {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  icon: typeof Users;
  dangerous?: boolean;
}

const MIGRATIONS: Migration[] = [
  {
    id: "migrate-to-beta",
    name: "Migrar usuários para Beta",
    description:
      "Cancela assinaturas Stripe de todos os usuários ativos, define role como 'beta' e envia email explicativo. Seguro para rodar múltiplas vezes (pula quem já é beta).",
    endpoint: "/api/super-admin/migrate-to-beta",
    icon: Users,
    dangerous: true,
  },
];

function MigrationResultsTable({ results }: { results: MigrationResult[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Detalhes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result, index) => (
          <TableRow key={index}>
            <TableCell className="font-mono text-sm">{result.email}</TableCell>
            <TableCell>
              {result.status === "migrated" ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Migrado
                </Badge>
              ) : result.status === "email_error" ? (
                <Badge variant="secondary">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Email falhou
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Erro
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {result.error || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function MigrationsPage() {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, MigrationResponse>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleRun = async (migration: Migration) => {
    if (migration.dangerous && confirmId !== migration.id) {
      setConfirmId(migration.id);
      return;
    }

    setConfirmId(null);
    setRunningId(migration.id);

    try {
      const response = await fetch(migration.endpoint, { method: "POST" });
      const data: MigrationResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.success === false ? "Migration failed" : "Unknown error");
      }

      setResults((prev) => ({ ...prev, [migration.id]: data }));
      toast.success(
        `Migração concluída: ${data.migrated} de ${data.total} usuários migrados`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao executar migração"
      );
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Migrações</h1>
        <p className="text-muted-foreground">
          Scripts de migração para operações administrativas. Cada migração é
          idempotente (segura para rodar múltiplas vezes).
        </p>
      </div>

      {MIGRATIONS.map((migration) => {
        const Icon = migration.icon;
        const isRunning = runningId === migration.id;
        const result = results[migration.id];
        const isConfirming = confirmId === migration.id;

        return (
          <Card key={migration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{migration.name}</CardTitle>
                    <CardDescription>{migration.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isConfirming && (
                    <>
                      <span className="text-sm text-destructive font-medium">
                        Tem certeza?
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmId(null)}
                      >
                        Cancelar
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => handleRun(migration)}
                    disabled={isRunning}
                    variant={isConfirming ? "destructive" : "default"}
                    size="sm"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Executando...
                      </>
                    ) : isConfirming ? (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Confirmar
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Executar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {result && (
              <CardContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="flex gap-4">
                    <div className="rounded-lg bg-muted p-3 text-center flex-1">
                      <p className="text-2xl font-bold">{result.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center flex-1">
                      <p className="text-2xl font-bold text-green-600">
                        {result.migrated}
                      </p>
                      <p className="text-xs text-muted-foreground">Migrados</p>
                    </div>
                    <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-center flex-1">
                      <p className="text-2xl font-bold text-red-600">
                        {result.errors}
                      </p>
                      <p className="text-xs text-muted-foreground">Erros</p>
                    </div>
                  </div>

                  {/* Detailed results */}
                  {result.results.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <MigrationResultsTable results={result.results} />
                    </div>
                  )}

                  {result.total === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum usuário para migrar. Todos já são beta ou admin.
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
