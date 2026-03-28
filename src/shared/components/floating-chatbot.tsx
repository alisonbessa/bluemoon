"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bug,
  Lightbulb,
  MessageSquare,
  Minus,
  RotateCcw,
  Loader2,
  ArrowLeft,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

const CHATBOT_MINIMIZED_KEY = "hivebudget_chatbot_minimized";

// ============================================
// Types
// ============================================

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  suggestHuman?: boolean;
}

interface ChatAction {
  label: string;
  value: string;
  variant?: "default" | "outline";
  icon?: React.ReactNode;
}

interface PendingAction {
  type: "expense" | "income";
  data: Record<string, unknown>;
}

type ChatMode = "initial" | "bug" | "suggestion" | "chat";

// ============================================
// Component
// ============================================

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mode, setMode] = useState<ChatMode>("initial");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  // Load minimized state
  useEffect(() => {
    const stored = localStorage.getItem(CHATBOT_MINIMIZED_KEY);
    if (stored === "true") setIsMinimized(true);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening or changing mode
  useEffect(() => {
    if (isOpen && mode !== "initial") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Initialize welcome message
  useEffect(() => {
    if (messages.length === 0) {
      resetChat();
    }
  }, []);

  const resetChat = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Ola! Como posso ajudar?",
        actions: [
          { label: "Reportar bug", value: "start_bug", icon: <Bug className="h-3.5 w-3.5" /> },
          { label: "Sugerir melhoria", value: "start_suggestion", icon: <Lightbulb className="h-3.5 w-3.5" /> },
          { label: "Tirar duvida", value: "start_chat", icon: <MessageSquare className="h-3.5 w-3.5" /> },
        ],
      },
    ]);
    setMode("initial");
    setPendingAction(null);
    setInput("");
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID() }]);
  }, []);

  // ============================================
  // Action handlers
  // ============================================

  const handleAction = useCallback(
    (action: string) => {
      switch (action) {
        case "start_bug":
          setMode("bug");
          addMessage({ role: "assistant", content: "Descreva o bug que encontrou. Tente incluir o que aconteceu, o que esperava e os passos para reproduzir." });
          break;

        case "start_suggestion":
          setMode("suggestion");
          addMessage({ role: "assistant", content: "Compartilhe sua sugestao de melhoria! Conte o que gostaria de ver na plataforma." });
          break;

        case "start_chat":
          setMode("chat");
          addMessage({
            role: "assistant",
            content: "Estou pronto para ajudar! Voce pode:\n\n- Registrar gastos: \"gastei 50 no mercado\"\n- Registrar receitas: \"recebi 5000 de salario\"\n- Consultar saldo: \"quanto gastei esse mes?\"\n- Consultar categoria: \"quanto sobrou em alimentacao?\"\n\nO que deseja fazer?",
          });
          break;

        case "confirm":
          handleConfirm();
          break;

        case "cancel":
          setPendingAction(null);
          addMessage({ role: "assistant", content: "Operacao cancelada. Em que mais posso ajudar?" });
          break;

        case "restart":
          resetChat();
          break;

        case "send_to_human":
          handleSendToHuman();
          break;
      }
    },
    [addMessage, resetChat]
  );

  // ============================================
  // Submit feedback (bug/suggestion)
  // ============================================

  const handleSubmitFeedback = async () => {
    const msg = input.trim();
    if (!msg) return;

    addMessage({ role: "user", content: msg });
    setInput("");
    setIsLoading(true);

    try {
      const feedbackType = mode === "bug" ? "bug" : "suggestion";
      const res = await fetch("/api/app/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: feedbackType, message: msg, page: pathname }),
      });

      if (!res.ok) throw new Error("Failed");

      const label = mode === "bug" ? "Bug reportado" : "Sugestao registrada";
      addMessage({
        role: "assistant",
        content: `${label} com sucesso! Obrigado pelo feedback.`,
        actions: [{ label: "Recomecar", value: "restart", icon: <RotateCcw className="h-3.5 w-3.5" /> }],
      });
      setMode("initial");
    } catch {
      addMessage({ role: "assistant", content: "Erro ao enviar feedback. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Submit chat message (AI processing)
  // ============================================

  const handleSubmitChat = async () => {
    const msg = input.trim();
    if (!msg) return;

    addMessage({ role: "user", content: msg });
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", message: msg }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();

      // Add bot response messages
      for (const botMsg of data.messages || []) {
        const actions: ChatAction[] = [];

        if (botMsg.suggestHuman) {
          actions.push({ label: "Enviar para humano", value: "send_to_human", icon: <UserIcon className="h-3.5 w-3.5" /> });
          actions.push({ label: "Recomecar", value: "restart", icon: <RotateCcw className="h-3.5 w-3.5" /> });
        }

        addMessage({
          role: "assistant",
          content: botMsg.content,
          suggestHuman: botMsg.suggestHuman,
          actions: actions.length > 0 ? actions : undefined,
        });
      }

      // Handle pending action (confirmation required)
      if (data.pendingAction) {
        setPendingAction(data.pendingAction);
        // Add confirmation actions to the last message
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            last.actions = [
              { label: "Confirmar", value: "confirm", variant: "default" },
              { label: "Cancelar", value: "cancel", variant: "outline" },
            ];
          }
          return updated;
        });
      }

      // If operation completed, offer restart
      if (data.completed) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            last.actions = [{ label: "Recomecar", value: "restart", icon: <RotateCcw className="h-3.5 w-3.5" /> }];
          }
          return updated;
        });
      }
    } catch {
      addMessage({ role: "assistant", content: "Erro ao processar mensagem. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Confirm pending action
  // ============================================

  const handleConfirm = async () => {
    if (!pendingAction) return;

    setIsLoading(true);
    addMessage({ role: "user", content: "Confirmar" });

    try {
      const res = await fetch("/api/app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", pendingAction }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setPendingAction(null);

      for (const botMsg of data.messages || []) {
        addMessage({
          role: "assistant",
          content: botMsg.content,
          actions: [{ label: "Recomecar", value: "restart", icon: <RotateCcw className="h-3.5 w-3.5" /> }],
        });
      }
    } catch {
      addMessage({ role: "assistant", content: "Erro ao confirmar operacao. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Send to human (creates feedback of type "other")
  // ============================================

  const handleSendToHuman = async () => {
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMsg) return;

    setIsLoading(true);

    try {
      const res = await fetch("/api/app/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "other", message: lastUserMsg.content, page: pathname }),
      });

      if (!res.ok) throw new Error("Failed");

      addMessage({
        role: "assistant",
        content: "Mensagem enviada para nossa equipe! Vamos analisar e retornar em breve.",
        actions: [{ label: "Recomecar", value: "restart", icon: <RotateCcw className="h-3.5 w-3.5" /> }],
      });
    } catch {
      addMessage({ role: "assistant", content: "Erro ao enviar mensagem. Tente novamente." });
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Submit handler (routes to correct flow)
  // ============================================

  const handleSubmit = () => {
    if (isLoading || !input.trim()) return;

    if (mode === "bug" || mode === "suggestion") {
      handleSubmitFeedback();
    } else {
      handleSubmitChat();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ============================================
  // Minimize / Restore
  // ============================================

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
    localStorage.setItem(CHATBOT_MINIMIZED_KEY, "true");
  };

  const handleRestore = () => {
    setIsMinimized(false);
    localStorage.setItem(CHATBOT_MINIMIZED_KEY, "false");
  };

  // ============================================
  // Render: Minimized state
  // ============================================

  if (isMinimized) {
    return (
      <button
        onClick={handleRestore}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        title="Abrir assistente"
      >
        <MessageCircle className="h-3.5 w-3.5" />
      </button>
    );
  }

  // ============================================
  // Render: Main
  // ============================================

  return (
    <div className="fixed bottom-4 right-4 z-50" ref={panelRef}>
      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-[340px] sm:w-[380px] rounded-lg border border-border bg-background shadow-xl animate-in slide-in-from-bottom-2 fade-in-0 duration-200 flex flex-col" style={{ maxHeight: "min(500px, calc(100vh - 120px))" }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              {mode !== "initial" && (
                <button
                  onClick={resetChat}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Voltar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <h3 className="text-sm font-semibold">Assistente</h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleMinimize}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Minimizar"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {/* Message content with line breaks */}
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                  {/* Action buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {msg.actions.map((action) => (
                        <button
                          key={action.value}
                          onClick={() => handleAction(action.value)}
                          disabled={isLoading}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                            action.variant === "outline"
                              ? "border border-border bg-background text-foreground hover:bg-muted"
                              : "bg-primary text-primary-foreground hover:bg-primary/90",
                            isLoading && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area (hidden in initial mode) */}
          {mode !== "initial" && (
            <div className="border-t px-3 py-2 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    mode === "bug"
                      ? "Descreva o bug..."
                      : mode === "suggestion"
                        ? "Descreva sua sugestao..."
                        : "Digite sua mensagem..."
                  }
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={1}
                  maxLength={2000}
                  style={{ maxHeight: "80px" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 80) + "px";
                  }}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleSubmit}
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAB Button */}
      {!isOpen && (
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          onClick={() => setIsOpen(true)}
          title="Abrir assistente"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
