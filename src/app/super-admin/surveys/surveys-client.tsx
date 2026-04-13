"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ChevronLeft, ChevronRight, Mail, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface SurveyRow {
  id: string;
  surveyKey: string;
  userId: string;
  nps: number | null;
  likes: string | null;
  missing: string | null;
  acceptsFollowUpEmails: boolean | null;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
}

interface Stats {
  total: number;
  avgNps: number | null;
  promoters: number;
  passives: number;
  detractors: number;
  followUpOptIns: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pageCount: number;
}

const LIMIT = 20;

export function SurveysClient() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useSWR<{
    surveys: SurveyRow[];
    pagination: Pagination;
    stats: Stats;
  }>(`/api/super-admin/surveys?page=${page}&limit=${LIMIT}`);

  const npsScore = data?.stats
    ? data.stats.total > 0
      ? Math.round(
          ((data.stats.promoters - data.stats.detractors) / data.stats.total) *
            100
        )
      : null
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Respostas de formulários</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Respostas de <span className="font-mono">beta_surveys</span>,
          ordenadas pela mais recente. Cada usuário responde cada formulário
          no máximo uma vez.
        </p>
      </div>

      {data?.stats && data.stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Respostas" value={data.stats.total} />
          <StatCard
            label="NPS"
            value={npsScore !== null ? npsScore : "—"}
            hint={
              data.stats.avgNps !== null
                ? `Média ${data.stats.avgNps.toFixed(1)}/10`
                : undefined
            }
            tone={
              npsScore === null
                ? "neutral"
                : npsScore >= 50
                ? "good"
                : npsScore >= 0
                ? "neutral"
                : "bad"
            }
          />
          <StatCard
            label="Promotores"
            value={data.stats.promoters}
            hint="9-10"
            tone="good"
          />
          <StatCard
            label="Passivos"
            value={data.stats.passives}
            hint="7-8"
          />
          <StatCard
            label="Detratores"
            value={data.stats.detractors}
            hint="0-6"
            tone={data.stats.detractors > 0 ? "bad" : "neutral"}
          />
        </div>
      )}

      {data?.stats && data.stats.followUpOptIns > 0 && (
        <div className="text-sm text-muted-foreground">
          <Check className="h-4 w-4 inline mr-1 text-primary" />
          {data.stats.followUpOptIns} pessoa
          {data.stats.followUpOptIns === 1 ? "" : "s"} aceita
          {data.stats.followUpOptIns === 1 ? "" : "m"} follow-up por e-mail.
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      )}
      {error && (
        <p className="text-sm text-destructive">
          Erro ao carregar: {String(error)}
        </p>
      )}

      {data?.surveys && data.surveys.length === 0 && (
        <div className="rounded-lg border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma resposta ainda. Quando alguém responder o formulário em{" "}
            <span className="font-mono">/app/survey/[key]</span>, aparece aqui.
          </p>
        </div>
      )}

      {data?.surveys && data.surveys.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Usuário</TableHead>
                <TableHead className="w-[80px] text-center">NPS</TableHead>
                <TableHead>O que mais gosta</TableHead>
                <TableHead>O que falta / atrapalha</TableHead>
                <TableHead className="w-[110px]">Follow-up?</TableHead>
                <TableHead className="w-[130px]">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.surveys.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {s.userName || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[170px]">
                      {s.userEmail ? (
                        <a
                          href={`mailto:${s.userEmail}`}
                          className="hover:underline inline-flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {s.userEmail}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {s.surveyKey}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <NpsBadge value={s.nps} />
                  </TableCell>
                  <TableCell className="align-top">
                    {s.likes ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {s.likes}
                      </p>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {s.missing ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {s.missing}
                      </p>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.acceptsFollowUpEmails ? (
                      <Badge variant="secondary">Sim</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(s.createdAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data?.pagination && data.pagination.pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            Página {data.pagination.page} de {data.pagination.pageCount} ·{" "}
            {data.pagination.total} respostas
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "good" | "bad" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "good" && "bg-primary/5 border-primary/30",
        tone === "bad" && "bg-destructive/5 border-destructive/30"
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function NpsBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }
  const tone =
    value >= 9 ? "good" : value >= 7 ? "neutral" : "bad";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold",
        tone === "good" && "bg-primary/15 text-primary",
        tone === "neutral" && "bg-muted text-foreground",
        tone === "bad" && "bg-destructive/15 text-destructive"
      )}
    >
      {value}
    </span>
  );
}
