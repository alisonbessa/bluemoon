"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Checkbox } from "@/shared/ui/checkbox";
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
import {
  Users,
  Zap,
  UserX,
  UserPlus,
  Ghost,
  Mail,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Segment = "power" | "active" | "inactive" | "new_inactive" | "never_active";

const SEGMENTS: { key: Segment; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "power", label: "Power Users", description: "20+ transacoes no periodo", icon: Zap },
  { key: "active", label: "Ativos", description: "Pelo menos 1 transacao no periodo", icon: Users },
  { key: "inactive", label: "Inativos", description: "Cadastrados antes, sem atividade no periodo", icon: UserX },
  { key: "new_inactive", label: "Novos Inativos", description: "Cadastrados no periodo, nunca criaram transacao", icon: UserPlus },
  { key: "never_active", label: "Nunca Ativos", description: "Nunca criaram nenhuma transacao", icon: Ghost },
];

const DAYS_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "60d", value: 60 },
  { label: "90d", value: 90 },
];

interface SegmentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  createdAt: string;
  tx_count: number;
  last_active: string | null;
}

export default function SegmentsPage() {
  const [segment, setSegment] = useState<Segment>("inactive");
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailCtaText, setEmailCtaText] = useState("");
  const [emailCtaUrl, setEmailCtaUrl] = useState("");
  const [isSending, setIsSending] = useState(false);

  const { data, isLoading } = useSWR<{
    users: SegmentUser[];
    segment: string;
    days: number;
    pagination: { total: number; pageCount: number; currentPage: number; perPage: number };
  }>(`/api/super-admin/users/segments?segment=${segment}&days=${days}&page=${page}&limit=50`);

  const users = data?.users ?? [];
  const pagination = data?.pagination;

  const handleSegmentChange = (s: string) => {
    setSegment(s as Segment);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleDaysChange = (d: number) => {
    setDays(d);
    setPage(1);
    setSelectedIds(new Set());
  };

  const toggleUser = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim() || selectedIds.size === 0) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/super-admin/users/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: Array.from(selectedIds),
          subject: emailSubject,
          body: emailBody,
          ...(emailCtaText && emailCtaUrl && { ctaText: emailCtaText, ctaUrl: emailCtaUrl }),
        }),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Erro ao enviar");

      toast.success(`${result.sent} email(s) enviado(s)!`);
      if (result.failed > 0) {
        toast.error(`${result.failed} falharam`);
      }

      setEmailDialogOpen(false);
      setEmailSubject("");
      setEmailBody("");
      setEmailCtaText("");
      setEmailCtaUrl("");
      setSelectedIds(new Set());
    } catch {
      toast.error("Erro ao enviar emails");
    } finally {
      setIsSending(false);
    }
  };

  const activeSegment = SEGMENTS.find((s) => s.key === segment)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Segmentos de Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Filtre usuarios por comportamento e envie emails direcionados
          </p>
        </div>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {SEGMENTS.map((s) => {
          const Icon = s.icon;
          const isActive = segment === s.key;
          return (
            <button
              key={s.key}
              onClick={() => handleSegmentChange(s.key)}
              className={`text-left p-3 rounded-lg border transition-all ${
                isActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
            </button>
          );
        })}
      </div>

      {/* Days filter */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Periodo:</span>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDaysChange(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                days === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {pagination && (
          <span className="text-sm text-muted-foreground ml-auto">
            {pagination.total} usuario(s) encontrado(s)
          </span>
        )}
      </div>

      {/* Action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado(s)
          </span>
          <Button
            size="sm"
            variant="default"
            className="gap-2"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-4 w-4" />
            Enviar Email
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Limpar selecao
          </Button>
        </div>
      )}

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <activeSegment.icon className="h-8 w-8 mb-3" />
              <p className="text-sm">Nenhum usuario neste segmento</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-10 py-3 px-4">
                    <Checkbox
                      checked={selectedIds.size === users.length && users.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Usuario</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                  <th className="text-center py-3 px-2 font-medium text-muted-foreground">Transacoes</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ultima Atividade</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cadastro</th>
                  <th className="w-10 py-3 px-2" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2.5 px-4">
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={() => toggleUser(user.id)}
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        {user.image ? (
                          <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                            {(user.name || user.email)?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium truncate max-w-[160px]">
                          {user.name || "Sem nome"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-muted-foreground truncate max-w-[200px]">
                      {user.email}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums">
                      {user.tx_count > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {user.tx_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">
                      {user.last_active
                        ? formatDistanceToNow(new Date(user.last_active), { addSuffix: true, locale: ptBR })
                        : <span className="text-muted-foreground/50">Nunca</span>
                      }
                    </td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: ptBR })}
                    </td>
                    <td className="py-2.5 px-2">
                      <Link href={`/super-admin/users/${user.id}`}>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {pagination.currentPage} de {pagination.pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Send Email Dialog */}
      <AlertDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar Email para {selectedIds.size} usuario(s)
            </AlertDialogTitle>
            <AlertDialogDescription>
              O email sera enviado individualmente para cada usuario selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Ex: Sentimos sua falta!"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">Mensagem</Label>
              <Textarea
                id="body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Escreva a mensagem aqui..."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ctaText">Texto do botao (opcional)</Label>
                <Input
                  id="ctaText"
                  value={emailCtaText}
                  onChange={(e) => setEmailCtaText(e.target.value)}
                  placeholder="Ex: Acessar Agora"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ctaUrl">URL do botao (opcional)</Label>
                <Input
                  id="ctaUrl"
                  value={emailCtaUrl}
                  onChange={(e) => setEmailCtaUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendEmail}
              disabled={isSending || !emailSubject.trim() || !emailBody.trim()}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Enviar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
