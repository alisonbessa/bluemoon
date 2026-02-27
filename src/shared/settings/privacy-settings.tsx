"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Eye, EyeOff, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

type PrivacyLevel = "all_visible" | "totals_only" | "private";

interface MemberData {
  id: string;
  privacyLevel: PrivacyLevel;
}

interface MembersResponse {
  members: MemberData[];
}

const privacyOptions: {
  value: PrivacyLevel;
  label: string;
  description: string;
  icon: typeof Eye;
}[] = [
  {
    value: "all_visible",
    label: "Tudo visivel",
    description: "Seu parceiro(a) pode ver todos os detalhes dos seus dados pessoais na visao \"Tudo\"",
    icon: Eye,
  },
  {
    value: "totals_only",
    label: "Apenas totais",
    description: "Seu parceiro(a) ve apenas os totais agregados (saldo total, gasto total) sem detalhes",
    icon: BarChart3,
  },
  {
    value: "private",
    label: "Privado",
    description: "Seus dados pessoais ficam completamente ocultos para o parceiro(a)",
    icon: EyeOff,
  },
];

interface PrivacySettingsProps {
  budgetId: string;
}

export function PrivacySettings({ budgetId }: PrivacySettingsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { data: membersData, mutate } = useSWR<MembersResponse>(
    `/api/app/members?budgetId=${budgetId}`
  );

  // Find the current user's member data (first member with privacyLevel)
  const currentMember = membersData?.members?.[0];
  const [selectedLevel, setSelectedLevel] = useState<PrivacyLevel>("all_visible");

  useEffect(() => {
    if (currentMember?.privacyLevel) {
      setSelectedLevel(currentMember.privacyLevel);
    }
  }, [currentMember?.privacyLevel]);

  const handleChange = async (value: PrivacyLevel) => {
    setSelectedLevel(value);
    setIsSaving(true);

    try {
      const response = await fetch("/api/app/members/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budgetId, privacyLevel: value }),
      });

      if (response.ok) {
        toast.success("Privacidade atualizada!");
        mutate();
      } else {
        toast.error("Erro ao atualizar privacidade");
        // Revert
        if (currentMember?.privacyLevel) {
          setSelectedLevel(currentMember.privacyLevel);
        }
      }
    } catch {
      toast.error("Erro ao atualizar privacidade");
      if (currentMember?.privacyLevel) {
        setSelectedLevel(currentMember.privacyLevel);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <EyeOff className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Privacidade dos dados pessoais</CardTitle>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <CardDescription>
          Controle o que seu parceiro(a) pode ver dos seus dados pessoais quando usar a visao &quot;Tudo&quot;
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedLevel} onValueChange={(v) => handleChange(v as PrivacyLevel)}>
          <div className="space-y-3">
            {privacyOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Label
                  key={option.value}
                  htmlFor={`privacy-${option.value}`}
                  className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                >
                  <RadioGroupItem value={option.value} id={`privacy-${option.value}`} className="mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{option.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </Label>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
