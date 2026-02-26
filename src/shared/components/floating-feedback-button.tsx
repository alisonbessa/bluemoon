"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, X, Send, Bug, Lightbulb, HelpCircle, Minus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

const FEEDBACK_MINIMIZED_KEY = "hivebudget_feedback_minimized";

type FeedbackType = "bug" | "suggestion" | "other";

const feedbackTypes: { value: FeedbackType; label: string; icon: typeof Bug; color: string }[] = [
  { value: "bug", label: "Bug", icon: Bug, color: "text-red-500" },
  { value: "suggestion", label: "Sugestão", icon: Lightbulb, color: "text-yellow-500" },
  { value: "other", label: "Outro", icon: HelpCircle, color: "text-blue-500" },
];

export function FloatingFeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Load minimized state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(FEEDBACK_MINIMIZED_KEY);
    if (stored === "true") {
      setIsMinimized(true);
    }
  }, []);

  // Close panel on click outside
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

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
    localStorage.setItem(FEEDBACK_MINIMIZED_KEY, "true");
  };

  const handleRestore = () => {
    setIsMinimized(false);
    localStorage.setItem(FEEDBACK_MINIMIZED_KEY, "false");
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error("Escreva uma mensagem antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/app/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          message: message.trim(),
          page: pathname,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao enviar");
      }

      toast.success("Feedback enviado com sucesso! Obrigado.");
      setMessage("");
      setSelectedType("bug");
      setIsOpen(false);
    } catch {
      toast.error("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Minimized: small pill at bottom-right
  if (isMinimized) {
    return (
      <button
        onClick={handleRestore}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        title="Abrir feedback"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50" ref={panelRef}>
      {/* Feedback panel */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-80 rounded-lg border border-border bg-background shadow-xl animate-in slide-in-from-bottom-2 fade-in-0 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Enviar Feedback</h3>
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

          {/* Body */}
          <div className="p-4 space-y-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {feedbackTypes.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  onClick={() => setSelectedType(value)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition-all",
                    selectedType === value
                      ? "border-primary bg-primary/5 font-medium"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", selectedType === value ? color : "text-muted-foreground")} />
                  {label}
                </button>
              ))}
            </div>

            {/* Message */}
            <Textarea
              placeholder={
                selectedType === "bug"
                  ? "Descreva o bug que encontrou..."
                  : selectedType === "suggestion"
                  ? "Compartilhe sua sugestão..."
                  : "Como podemos ajudar?"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-24 max-h-40 resize-none text-sm"
              maxLength={2000}
            />

            {/* Character count */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {message.length}/2000
              </span>

              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !message.trim()}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Enviando...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FAB button */}
      {!isOpen && (
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          onClick={() => setIsOpen(true)}
          title="Enviar feedback"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
