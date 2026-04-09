"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import {
  Database,
  Play,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type SelectResult = {
  operation: "SELECT";
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
};

type PreviewResult = {
  operation: "UPDATE" | "DELETE";
  mode: "preview";
  affectedRows: Record<string, unknown>[];
  affectedCount: number;
  truncated: boolean;
  previewQuery: string;
};

type ExecuteResult = {
  operation: "UPDATE" | "DELETE" | "INSERT";
  mode: "execute";
  rowsAffected: number;
  success: boolean;
};

type InsertPreviewResult = {
  operation: "INSERT";
  mode: "preview";
  message: string;
};

type QueryResult = SelectResult | PreviewResult | ExecuteResult | InsertPreviewResult;

const EXAMPLES = [
  {
    label: "Listar usuários recentes",
    query: `SELECT id, email, name, "createdAt"\nFROM app_user\nWHERE deleted_at IS NULL\nORDER BY "createdAt" DESC\nLIMIT 20;`,
  },
  {
    label: "Bills de um budget",
    query: `SELECT id, name, amount, start_date, end_date, is_active\nFROM recurring_bills\nWHERE budget_id = '<budget_id>';`,
  },
  {
    label: "Limpar startDate de bills",
    query: `UPDATE recurring_bills\nSET start_date = NULL\nWHERE budget_id = '<budget_id>';`,
  },
  {
    label: "Alocações de um budget/mês",
    query: `SELECT category_id, allocated, carried_over\nFROM monthly_allocations\nWHERE budget_id = '<budget_id>'\n  AND year = 2026\n  AND month = 4;`,
  },
];

export default function SqlQueryPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingExecution, setPendingExecution] = useState<PreviewResult | null>(null);

  const runQuery = async (mode: "preview" | "execute") => {
    if (!query.trim()) {
      toast.error("Digite uma query");
      return;
    }

    setIsRunning(true);
    setError(null);
    if (mode === "preview") {
      setResult(null);
      setPendingExecution(null);
    }

    try {
      const res = await fetch("/api/super-admin/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao executar query");
        return;
      }

      setResult(data);

      // If preview of UPDATE/DELETE, keep pending execution
      if (mode === "preview" && (data.operation === "UPDATE" || data.operation === "DELETE")) {
        setPendingExecution(data);
      } else {
        setPendingExecution(null);
      }

      if (mode === "execute") {
        toast.success(`Query executada: ${data.rowsAffected} linha(s) afetada(s)`);
      }
    } catch {
      setError("Erro ao executar query");
    } finally {
      setIsRunning(false);
    }
  };

  const confirmExecute = () => runQuery("execute");

  const clearQuery = () => {
    setQuery("");
    setResult(null);
    setError(null);
    setPendingExecution(null);
  };

  const loadExample = (exampleQuery: string) => {
    setQuery(exampleQuery);
    setResult(null);
    setError(null);
    setPendingExecution(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const renderTable = (rows: Record<string, unknown>[]) => {
    if (rows.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic p-4">Nenhuma linha retornada</p>
      );
    }
    const columns = Object.keys(rows[0]);
    return (
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted">
            <tr>
              {columns.map((col) => (
                <th key={col} className="text-left p-2 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                {columns.map((col) => {
                  const value = row[col];
                  const displayValue =
                    value === null
                      ? "NULL"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value);
                  return (
                    <td
                      key={col}
                      className="p-2 font-mono whitespace-nowrap max-w-xs truncate"
                      title={displayValue}
                    >
                      {value === null ? (
                        <span className="text-muted-foreground italic">NULL</span>
                      ) : (
                        displayValue
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Database className="h-8 w-8 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">SQL Query</h1>
          <p className="text-muted-foreground text-sm">
            Execute queries no banco com proteções de segurança
          </p>
        </div>
      </div>

      {/* Safety notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Proteções ativas</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside text-sm space-y-0.5 mt-1">
            <li>DROP, TRUNCATE, ALTER, CREATE são bloqueados</li>
            <li>UPDATE e DELETE exigem cláusula WHERE</li>
            <li>UPDATE e DELETE mostram preview das linhas afetadas antes de executar</li>
            <li>Máximo 200 linhas afetadas por operação e 500 linhas retornadas</li>
            <li>Apenas 1 statement por execução</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        {/* Query editor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Query</CardTitle>
            <CardDescription className="text-xs">
              Digite ou cole uma query SQL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SELECT * FROM app_user LIMIT 10;"
              rows={10}
              className="font-mono text-xs resize-y"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => runQuery("preview")} disabled={isRunning} className="gap-2">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Executar
              </Button>
              <Button variant="outline" onClick={clearQuery} disabled={isRunning}>
                <Trash2 className="h-4 w-4 mr-1.5" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Examples */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Exemplos</CardTitle>
            <CardDescription className="text-xs">Clique para carregar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                onClick={() => loadExample(example.query)}
                className="w-full text-left text-xs font-medium p-2 rounded border hover:bg-muted/50 transition-colors"
              >
                {example.label}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription className="font-mono text-xs break-all">{error}</AlertDescription>
        </Alert>
      )}

      {/* Result */}
      {result && result.operation === "SELECT" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Resultado ({result.rowCount} linha{result.rowCount === 1 ? "" : "s"})
              {result.truncated && (
                <span className="text-xs text-amber-600">(truncado em 500)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>{renderTable(result.rows)}</CardContent>
        </Card>
      )}

      {result && result.operation !== "SELECT" && result.operation !== "INSERT" && "mode" in result && result.mode === "preview" && (
        <>
          <Alert variant="destructive">
            <Eye className="h-4 w-4" />
            <AlertTitle>Preview - {result.affectedCount} linha(s) seriam afetadas</AlertTitle>
            <AlertDescription>
              Revise as linhas abaixo. Se estiver tudo certo, clique em <strong>Confirmar execução</strong>.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>Linhas afetadas</span>
                <button
                  onClick={() => copyToClipboard(result.previewQuery)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  title="Copiar SQL de preview"
                >
                  <Copy className="h-3 w-3" />
                  Preview SQL
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderTable(result.affectedRows)}
              {pendingExecution && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="destructive"
                    onClick={confirmExecute}
                    disabled={isRunning}
                    className="gap-2"
                  >
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirmar execução ({result.affectedCount} linhas)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPendingExecution(null);
                      setResult(null);
                    }}
                    disabled={isRunning}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {result && "mode" in result && result.mode === "execute" && "rowsAffected" in result && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Query executada com sucesso</AlertTitle>
          <AlertDescription>
            {result.rowsAffected} linha(s) afetada(s).
          </AlertDescription>
        </Alert>
      )}

      {result && result.operation === "INSERT" && "mode" in result && result.mode === "preview" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              INSERT sem preview
            </CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={confirmExecute}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Executar INSERT mesmo assim
              </Button>
              <Button variant="outline" onClick={() => setResult(null)} disabled={isRunning}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
