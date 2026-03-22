"use client";

import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { User, Users, GraduationCap, Baby, ArrowRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { BudgetTemplate } from "@/shared/lib/budget-templates";

interface StepProfileProps {
  templates: BudgetTemplate[];
  selectedTemplate: string;
  onSelectTemplate: (codename: string) => void;
  isDuo: boolean;
  partnerEmail: string;
  onPartnerEmailChange: (email: string) => void;
  onNext: () => void;
}

const TEMPLATE_ICONS: Record<string, typeof User> = {
  solteiro: User,
  universitario: GraduationCap,
  casal_sem_filhos: Users,
  casal_com_filhos: Baby,
};

export function StepProfile({
  templates,
  selectedTemplate,
  onSelectTemplate,
  isDuo,
  partnerEmail,
  onPartnerEmailChange,
  onNext,
}: StepProfileProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Qual é o seu perfil?</h2>
        <p className="text-muted-foreground">
          Escolha o modelo que mais combina com você.
          Você poderá ajustar tudo depois.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {templates.map((template) => {
          const Icon = TEMPLATE_ICONS[template.codename] || User;
          const isSelected = selectedTemplate === template.codename;

          return (
            <Card
              key={template.codename}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary ring-2 ring-primary/20"
              )}
              onClick={() => onSelectTemplate(template.codename)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{template.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isDuo && (
        <div className="space-y-2">
          <Label htmlFor="partner-email">
            Email do parceiro(a) (opcional)
          </Label>
          <Input
            id="partner-email"
            type="email"
            placeholder="parceiro@email.com"
            value={partnerEmail}
            onChange={(e) => onPartnerEmailChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Enviaremos um convite para compartilhar o orçamento.
            Pode fazer isso depois também.
          </p>
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={onNext}
        disabled={!selectedTemplate}
      >
        Próximo
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
