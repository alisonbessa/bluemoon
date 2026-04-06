"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  MessageSquare,
  Users,
  Hash,
  ArrowLeft,
  Loader2,
  Bot,
  User as UserIcon,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChatStats {
  totalMessages: number;
  uniqueUsers: number;
  totalSessions: number;
  userMessages: number;
  assistantMessages: number;
}

interface SessionSummary {
  session_id: string;
  user_id: string;
  message_count: number;
  started_at: string;
  last_message_at: string;
  first_user_message: string;
  last_assistant_message: string;
  user_name: string;
  user_email: string;
  user_image: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userEmail: string;
}

export default function ChatLogsPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data, isLoading } = useSWR<{ stats: ChatStats; recentSessions: SessionSummary[] }>(
    "/api/super-admin/stats/chat-logs"
  );

  const { data: sessionDetail, isLoading: detailLoading } = useSWR<{ messages: ChatMessage[]; sessionId: string }>(
    selectedSessionId ? `/api/super-admin/stats/chat-logs/${selectedSessionId}` : null
  );

  const stats = data?.stats;
  const sessions = data?.recentSessions ?? [];

  if (selectedSessionId && sessionDetail) {
    const msgs = sessionDetail.messages;
    const firstMsg = msgs[0];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedSessionId(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-lg font-semibold">Conversa</h1>
            {firstMsg && (
              <p className="text-xs text-muted-foreground">
                {firstMsg.userName || firstMsg.userEmail} · {format(parseISO(firstMsg.createdAt), "dd MMM yyyy HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              msgs.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "assistant" ? "" : "flex-row-reverse"}`}
                >
                  <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs ${
                    msg.role === "assistant"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <UserIcon className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[75%] ${msg.role === "assistant" ? "" : "text-right"}`}>
                    <div className={`inline-block rounded-lg px-3 py-2 text-sm ${
                      msg.role === "assistant"
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                      {format(parseISO(msg.createdAt), "HH:mm:ss")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Chat IA - Historico</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conversas dos ultimos 7 dias entre usuarios e o assistente
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Conversas</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.totalSessions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Usuarios</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.uniqueUsers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Mensagens</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.totalMessages}</p>
              <p className="text-xs text-muted-foreground">{stats.userMessages} usuario / {stats.assistantMessages} IA</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Msgs/Conversa</p>
              </div>
              <p className="text-2xl font-bold tabular-nums">
                {stats.totalSessions > 0
                  ? (stats.totalMessages / stats.totalSessions).toFixed(1)
                  : "0"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Conversas Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-3" />
              <p className="text-sm">Nenhuma conversa registrada nos ultimos 7 dias</p>
              <p className="text-xs mt-1">As conversas aparecerao aqui quando usuarios usarem o assistente</p>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session) => (
                <button
                  key={session.session_id}
                  onClick={() => setSelectedSessionId(session.session_id)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-1.5">
                    {session.user_image ? (
                      <img src={session.user_image} alt="" className="h-7 w-7 rounded-full" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {(session.user_name || session.user_email)?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{session.user_name || session.user_email}</span>
                      <span className="text-xs text-muted-foreground ml-2">{session.user_email}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(session.last_message_at), "dd MMM HH:mm", { locale: ptBR })}
                      </span>
                      <br />
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                        {session.message_count} msgs
                      </span>
                    </div>
                  </div>
                  <div className="pl-10 space-y-0.5">
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-medium text-foreground">Usuario:</span>{" "}
                      {session.first_user_message?.slice(0, 120)}
                    </p>
                    {session.last_assistant_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        <span className="font-medium text-primary">IA:</span>{" "}
                        {session.last_assistant_message?.slice(0, 120)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
