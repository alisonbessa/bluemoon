"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

interface AILog {
  id: string;
  userId: string | null;
  budgetId: string | null;
  originalMessage: string;
  aiResponse: {
    intent: string;
    confidence: number;
    data: Record<string, unknown> | null;
    requiresConfirmation: boolean;
  };
  userContext: {
    categoriesCount: number;
    incomeSourcesCount: number;
    goalsCount: number;
    accountsCount: number;
    hasDefaultAccount: boolean;
  } | null;
  resolution: string;
  correctedIntent: string | null;
  correctedCategoryId: string | null;
  correctedAmount: number | null;
  isLowConfidence: boolean;
  isUnknownIntent: boolean;
  errorMessage: string | null;
  createdAt: string;
  resolvedAt: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface LogsResponse {
  logs: AILog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    confirmed: number;
    corrected: number;
    cancelled: number;
    unknown: number;
    lowConfidence: number;
    accuracy: string;
  };
  intentDistribution: Array<{ intent: string; count: number }>;
  commonCorrections: Array<{
    originalMessage: string;
    aiIntent: string;
    correctedCategoryId: string | null;
    count: number;
  }>;
}

interface ExportResponse {
  totalExamples: number;
  correctPredictions: number;
  incorrectPredictions: number;
  accuracy: string;
  suggestions: string[];
  promptExamples: Array<{
    userMessage: string;
    correctOutput: {
      intent: string;
      categoryHint?: string;
    };
    aiMistake: string;
  }>;
}

const getResolutionBadge = (resolution: string) => {
  switch (resolution) {
    case "confirmed":
      return <Badge variant="default" className="bg-green-500">Confirmado</Badge>;
    case "corrected":
      return <Badge variant="default" className="bg-yellow-500">Corrigido</Badge>;
    case "cancelled":
      return <Badge variant="default" className="bg-red-500">Cancelado</Badge>;
    case "fallback":
      return <Badge variant="secondary">Fallback</Badge>;
    case "unknown_ignored":
      return <Badge variant="outline">Ignorado</Badge>;
    default:
      return <Badge variant="outline">Pendente</Badge>;
  }
};

const getConfidenceBadge = (confidence: number) => {
  if (confidence >= 0.85) {
    return <Badge variant="default" className="bg-green-500">{(confidence * 100).toFixed(0)}%</Badge>;
  } else if (confidence >= 0.6) {
    return <Badge variant="default" className="bg-yellow-500">{(confidence * 100).toFixed(0)}%</Badge>;
  } else {
    return <Badge variant="destructive">{(confidence * 100).toFixed(0)}%</Badge>;
  }
};

export default function TelegramAIPage() {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AILog | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data, mutate, isLoading } = useSWR<LogsResponse>(
    `/api/super-admin/telegram-ai-logs?filter=${filter}&page=${page}&limit=20`
  );

  const { data: exportData } = useSWR<ExportResponse>(
    showSuggestions ? "/api/super-admin/telegram-ai-logs/export" : null
  );

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja limpar logs antigos? Logs corrigidos serao mantidos.")) {
      return;
    }

    try {
      const response = await fetch("/api/super-admin/telegram-ai-logs", {
        method: "DELETE",
      });
      const result = await response.json();
      toast.success(result.message);
      mutate();
    } catch {
      toast.error("Erro ao limpar logs");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/super-admin/telegram-ai-logs/export");
      const result = await response.json();

      // Download as JSON
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `telegram-ai-training-${format(new Date(), "yyyy-MM-dd")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso!");
    } catch {
      toast.error("Erro ao exportar dados");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Telegram AI Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Analise e melhore a precisao do bot do Telegram
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSuggestions(true)}>
            <Lightbulb className="h-4 w-4 mr-2" />
            Sugestoes
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Antigos
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Confirmados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {data.stats.confirmed}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Corrigidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {data.stats.corrected}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                Cancelados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {data.stats.cancelled}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-4 w-4 text-gray-500" />
                Desconhecidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {data.stats.unknown}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Baixa Confianca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {data.stats.lowConfidence}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Precisao
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {data.stats.accuracy}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Intent Distribution */}
      {data?.intentDistribution && data.intentDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuicao de Intencoes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.intentDistribution.map((item) => (
                <Badge key={item.intent} variant="secondary" className="text-sm">
                  {item.intent}: {item.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="unknown">Nao Reconhecidos</SelectItem>
            <SelectItem value="low_confidence">Baixa Confianca</SelectItem>
            <SelectItem value="corrected">Corrigidos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mensagem</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Intencao AI</TableHead>
                <TableHead>Confianca</TableHead>
                <TableHead>Resolucao</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="max-w-xs truncate font-mono text-sm">
                      {log.originalMessage}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.userName || log.userEmail || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.isUnknownIntent ? "destructive" : "secondary"}>
                        {log.aiResponse.intent}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(log.aiResponse.confidence)}
                    </TableCell>
                    <TableCell>
                      {getResolutionBadge(log.resolution)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Pagina {page} de {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Analise completa da interpretacao AI
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Mensagem Original
                </label>
                <div className="mt-1 p-3 bg-muted rounded-md font-mono">
                  {selectedLog.originalMessage}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Intencao Detectada
                  </label>
                  <div className="mt-1">
                    <Badge variant={selectedLog.isUnknownIntent ? "destructive" : "secondary"}>
                      {selectedLog.aiResponse.intent}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Confianca
                  </label>
                  <div className="mt-1">
                    {getConfidenceBadge(selectedLog.aiResponse.confidence)}
                  </div>
                </div>
              </div>

              {selectedLog.aiResponse.data && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Dados Extraidos
                  </label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                    {JSON.stringify(selectedLog.aiResponse.data, null, 2)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Resolucao
                  </label>
                  <div className="mt-1">
                    {getResolutionBadge(selectedLog.resolution)}
                  </div>
                </div>
                {selectedLog.correctedIntent && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Intencao Corrigida
                    </label>
                    <div className="mt-1">
                      <Badge variant="default">{selectedLog.correctedIntent}</Badge>
                    </div>
                  </div>
                )}
              </div>

              {selectedLog.userContext && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Contexto do Usuario
                  </label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {selectedLog.userContext.categoriesCount} categorias
                    </Badge>
                    <Badge variant="outline">
                      {selectedLog.userContext.incomeSourcesCount} fontes de renda
                    </Badge>
                    <Badge variant="outline">
                      {selectedLog.userContext.goalsCount} metas
                    </Badge>
                    <Badge variant="outline">
                      {selectedLog.userContext.accountsCount} contas
                    </Badge>
                  </div>
                </div>
              )}

              {selectedLog.errorMessage && (
                <div>
                  <label className="text-sm font-medium text-red-500">
                    Erro
                  </label>
                  <div className="mt-1 p-3 bg-red-50 dark:bg-red-950/20 rounded-md text-red-600 dark:text-red-400">
                    {selectedLog.errorMessage}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suggestions Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Sugestoes para Melhorar o Modelo
            </DialogTitle>
            <DialogDescription>
              Baseado nos logs de correcoes e erros
            </DialogDescription>
          </DialogHeader>
          {exportData && (
            <div className="space-y-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Exemplos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{exportData.totalExamples}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Corretos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {exportData.correctPredictions}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Precisao</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {exportData.accuracy}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Suggestions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Padroes Identificados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {exportData.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-1 shrink-0" />
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Example Corrections */}
              {exportData.promptExamples.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Exemplos de Erros</CardTitle>
                    <CardDescription>
                      Adicione estes exemplos ao prompt para melhorar a precisao
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {exportData.promptExamples.slice(0, 5).map((example, i) => (
                        <div key={i} className="p-3 border rounded-md space-y-2">
                          <div>
                            <span className="text-sm text-muted-foreground">Mensagem:</span>
                            <div className="font-mono text-sm">&quot;{example.userMessage}&quot;</div>
                          </div>
                          <div className="flex gap-4">
                            <div>
                              <span className="text-sm text-red-500">AI disse:</span>
                              <Badge variant="destructive" className="ml-2">
                                {example.aiMistake}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-sm text-green-500">Correto:</span>
                              <Badge variant="default" className="ml-2 bg-green-500">
                                {example.correctOutput.intent}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
