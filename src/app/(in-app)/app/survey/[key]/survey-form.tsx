"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";

interface SurveyFormProps {
  surveyKey: string;
}

export function SurveyForm({ surveyKey }: SurveyFormProps) {
  const [nps, setNps] = useState<number | null>(null);
  const [likes, setLikes] = useState("");
  const [missing, setMissing] = useState("");
  const [acceptsFollowUpEmails, setAcceptsFollowUpEmails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nps === null) {
      toast.error("Escolha uma nota de 0 a 10");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          surveyKey,
          nps,
          likes: likes.trim() || null,
          missing: missing.trim() || null,
          acceptsFollowUpEmails,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.message || "Falha ao enviar");
      }

      setDone(true);
      toast.success("Obrigado! Sua resposta foi registrada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6">
        <p className="font-medium">Obrigado, de verdade!</p>
        <p className="text-sm text-muted-foreground mt-2">
          Se lembrar de mais algo depois, pode só responder ao e-mail
          original — leio tudo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <Label className="text-base font-medium">
          De 0 a 10, o quanto você recomendaria o HiveBudget pra um amigo?
        </Label>
        <div className="grid grid-cols-11 gap-1 mt-3">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNps(n)}
              className={cn(
                "h-10 rounded-md border text-sm font-medium transition-colors",
                nps === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
              aria-pressed={nps === n}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="likes" className="text-base font-medium">
          O que você mais gosta hoje?
        </Label>
        <Textarea
          id="likes"
          value={likes}
          onChange={(e) => setLikes(e.target.value)}
          className="mt-2"
          rows={3}
          placeholder="Uma feature, um detalhe, qualquer coisa que te fez ficar..."
        />
      </div>

      <div>
        <Label htmlFor="missing" className="text-base font-medium">
          O que está faltando ou atrapalhando?
        </Label>
        <Textarea
          id="missing"
          value={missing}
          onChange={(e) => setMissing(e.target.value)}
          className="mt-2"
          rows={4}
          placeholder="Pode ser específico: algo que você tenta fazer e não consegue, um bug, uma feature que faz falta."
        />
      </div>

      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox
          id="accepts-follow-up"
          checked={acceptsFollowUpEmails}
          onCheckedChange={(v) => setAcceptsFollowUpEmails(v === true)}
        />
        <Label
          htmlFor="accepts-follow-up"
          className="text-sm font-normal leading-relaxed cursor-pointer"
        >
          Tudo bem eu te mandar perguntas pontuais por e-mail de vez em
          quando (tipo quando for decidir o que priorizar no roadmap)? Sem
          ligação nem vídeo — só texto.
        </Label>
      </div>

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Enviando..." : "Enviar resposta"}
      </Button>
    </form>
  );
}
