"use client";

import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { FormModalWrapper } from "@/shared/molecules";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
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
  RefreshCw,
  HelpCircle,
  MessageSquare,
  Bug,
} from "lucide-react";
import { toast } from "sonner";
import type { MeResponse } from "@/app/api/app/me/types";
import { getFirstName } from "@/shared/lib/string-utils";

interface SupportCardProps {
  user: MeResponse["user"] | undefined;
  startTutorial: (id: string) => void;
}

export function SupportCard({ user, startTutorial }: SupportCardProps) {
  const [showOnboardingConfirm, setShowOnboardingConfirm] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"question" | "bug" | "feedback">("question");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const handleRestartOnboarding = () => {
    setShowOnboardingConfirm(false);
    startTutorial("initial-setup");
    toast.info("Tutorial iniciado! Siga os passos para revisar sua configuração.");
  };

  const openFeedbackModal = (type: "question" | "bug" | "feedback") => {
    setFeedbackType(type);
    setFeedbackMessage("");
    setShowFeedbackModal(true);
  };

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    setIsSendingFeedback(true);
    try {
      const typeLabels = {
        question: "Dúvida",
        bug: "Bug",
        feedback: "Sugestão",
      };

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:
            getFirstName(user?.displayName) ??
            getFirstName(user?.name) ??
            user?.email?.split("@")[0] ??
            "",
          email: user?.email || "sem-email@hivebudget.com",
          message: `[${typeLabels[feedbackType as keyof typeof typeLabels]}] ${feedbackMessage}`,
        }),
      });

      if (response.ok) {
        toast.success("Mensagem enviada! Responderemos em breve.");
        setFeedbackMessage("");
        setShowFeedbackModal(false);
      } else {
        toast.error("Erro ao enviar mensagem");
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suporte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => openFeedbackModal("question")}
          >
            <HelpCircle className="h-4 w-4" />
            Tirar dúvidas
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => openFeedbackModal("feedback")}
          >
            <MessageSquare className="h-4 w-4" />
            Enviar sugestão
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => openFeedbackModal("bug")}
          >
            <Bug className="h-4 w-4" />
            Reportar bug
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setShowOnboardingConfirm(true)}
          >
            <RefreshCw className="h-4 w-4" />
            Refazer configuração inicial
          </Button>
        </CardContent>
      </Card>

      {/* Onboarding Confirmation Dialog */}
      <AlertDialog open={showOnboardingConfirm} onOpenChange={setShowOnboardingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refazer configuração inicial?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso permitirá que você reconfigure suas categorias, contas e fontes de renda.
              Os dados existentes serão mantidos, mas novas categorias podem ser adicionadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartOnboarding}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Feedback Modal */}
      <FormModalWrapper
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        title={
          feedbackType === "question" ? "Tirar dúvidas"
          : feedbackType === "bug" ? "Reportar bug"
          : "Enviar sugestão"
        }
        description={
          feedbackType === "question" ? "Descreva sua dúvida e responderemos por email."
          : feedbackType === "bug" ? "Descreva o problema encontrado com o máximo de detalhes."
          : "Compartilhe suas ideias para melhorar o app."
        }
        isSubmitting={isSendingFeedback}
        onSubmit={handleSendFeedback}
        submitLabel="Enviar"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Mensagem</Label>
            <Textarea
              id="feedback-message"
              placeholder={
                feedbackType === "question"
                  ? "Qual é a sua dúvida?"
                  : feedbackType === "bug"
                  ? "O que aconteceu? Descreva os passos para reproduzir..."
                  : "O que você gostaria de ver no app?"
              }
              value={feedbackMessage}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedbackMessage(e.target.value)}
              rows={5}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Responderemos para {user?.email}
          </p>
        </div>
      </FormModalWrapper>
    </>
  );
}
