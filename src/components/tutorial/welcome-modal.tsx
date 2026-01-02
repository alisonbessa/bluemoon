"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, ArrowRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface HouseholdMember {
  type: "partner" | "child" | "adult" | "pet";
  count: number;
}

interface WelcomeData {
  displayName: string;
  household: HouseholdMember[];
}

interface WelcomeModalProps {
  onComplete: (data: WelcomeData) => Promise<void>;
  onSkip: () => void;
  isOpen: boolean;
}

const HOUSEHOLD_OPTIONS = [
  {
    type: "partner" as const,
    icon: "💑",
    label: "Parceiro(a)",
    description: "Cônjuge ou companheiro(a)",
    hasCount: false,
  },
  {
    type: "child" as const,
    icon: "👶",
    label: "Filho(s)",
    description: "Crianças ou dependentes",
    hasCount: true,
  },
  {
    type: "adult" as const,
    icon: "👤",
    label: "Outros adultos",
    description: "Pais, irmãos ou outros",
    hasCount: true,
  },
  {
    type: "pet" as const,
    icon: "🐾",
    label: "Pet(s)",
    description: "Animais de estimação",
    hasCount: true,
  },
];

export function WelcomeModal({ onComplete, onSkip, isOpen }: WelcomeModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggleType = (type: string) => {
    const newSelected = new Set(selectedTypes);
    if (newSelected.has(type)) {
      newSelected.delete(type);
      // Reset count when deselecting
      const newCounts = { ...counts };
      delete newCounts[type];
      setCounts(newCounts);
    } else {
      newSelected.add(type);
      // Set default count
      const option = HOUSEHOLD_OPTIONS.find((o) => o.type === type);
      if (option?.hasCount) {
        setCounts({ ...counts, [type]: 1 });
      }
    }
    setSelectedTypes(newSelected);
  };

  const updateCount = (type: string, count: number) => {
    setCounts({ ...counts, [type]: Math.max(1, Math.min(10, count)) });
  };

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      setError("Por favor, informe seu nome");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const household: HouseholdMember[] = Array.from(selectedTypes).map((type) => ({
        type: type as HouseholdMember["type"],
        count: counts[type] || 1,
      }));

      await onComplete({
        displayName: displayName.trim(),
        household,
      });
    } catch (err) {
      setError("Erro ao salvar. Tente novamente.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Bem-vindo ao HiveBudget!
              </h1>
              <p className="text-sm text-muted-foreground">
                Vamos configurar sua vida financeira em poucos minutos
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-base font-medium">
              Como você gostaria de ser chamado(a)?
            </Label>
            <Input
              id="displayName"
              placeholder="Seu nome ou apelido"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (error) setError("");
              }}
              className={cn(
                "h-11 text-base",
                error && "border-destructive focus-visible:ring-destructive"
              )}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Household */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-medium">
                Quem mais faz parte do seu orçamento?
              </Label>
            </div>
            <p className="text-sm text-muted-foreground -mt-1">
              Opcional - ajuda a personalizar categorias
            </p>

            <div className="grid grid-cols-2 gap-2">
              {HOUSEHOLD_OPTIONS.map((option) => {
                const isSelected = selectedTypes.has(option.type);
                return (
                  <div
                    key={option.type}
                    className={cn(
                      "relative rounded-lg border p-3 cursor-pointer transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                    onClick={() => toggleType(option.type)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xl">{option.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{option.label}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </div>
                      </div>
                      <Checkbox
                        checked={isSelected}
                        className="mt-0.5"
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleType(option.type)}
                      />
                    </div>

                    {/* Count input */}
                    {isSelected && option.hasCount && (
                      <div
                        className="mt-2 flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-muted-foreground">Qtd:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"
                            onClick={() => updateCount(option.type, (counts[option.type] || 1) - 1)}
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-medium">
                            {counts[option.type] || 1}
                          </span>
                          <button
                            type="button"
                            className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted"
                            onClick={() => updateCount(option.type, (counts[option.type] || 1) + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isSubmitting}
          >
            Pular tutorial
          </button>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                Começar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
