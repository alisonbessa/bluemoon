"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Loader2, Sparkles, ChevronRight, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

interface CategorySuggestion {
  name: string;
  icon: string;
  groupCode: string;
  behavior: "set_aside" | "refill_up";
}

interface GroupSuggestions {
  code: string;
  name: string;
  icon: string;
  categories: CategorySuggestion[];
}

// Suggested categories organized by group
const CATEGORY_SUGGESTIONS: GroupSuggestions[] = [
  {
    code: "essential",
    name: "Essencial",
    icon: "📌",
    categories: [
      { name: "Moradia", icon: "🏠", groupCode: "essential", behavior: "refill_up" },
      { name: "Mercado", icon: "🛒", groupCode: "essential", behavior: "refill_up" },
      { name: "Energia", icon: "💡", groupCode: "essential", behavior: "refill_up" },
      { name: "Água", icon: "💧", groupCode: "essential", behavior: "refill_up" },
      { name: "Internet", icon: "📶", groupCode: "essential", behavior: "refill_up" },
      { name: "Celular", icon: "📱", groupCode: "essential", behavior: "refill_up" },
      { name: "Transporte", icon: "🚗", groupCode: "essential", behavior: "refill_up" },
      { name: "Combustível", icon: "⛽", groupCode: "essential", behavior: "refill_up" },
      { name: "Saúde", icon: "🏥", groupCode: "essential", behavior: "refill_up" },
      { name: "Farmácia", icon: "💊", groupCode: "essential", behavior: "refill_up" },
      { name: "Educação", icon: "📚", groupCode: "essential", behavior: "refill_up" },
    ],
  },
  {
    code: "lifestyle",
    name: "Estilo de Vida",
    icon: "🎨",
    categories: [
      { name: "Alimentação Fora", icon: "🍔", groupCode: "lifestyle", behavior: "refill_up" },
      { name: "Delivery", icon: "🛵", groupCode: "lifestyle", behavior: "refill_up" },
      { name: "Streaming", icon: "📺", groupCode: "lifestyle", behavior: "refill_up" },
      { name: "Academia", icon: "💪", groupCode: "lifestyle", behavior: "refill_up" },
      { name: "Vestuário", icon: "👕", groupCode: "lifestyle", behavior: "refill_up" },
      { name: "Beleza", icon: "💅", groupCode: "lifestyle", behavior: "refill_up" },
      { name: "Pet", icon: "🐕", groupCode: "lifestyle", behavior: "refill_up" },
    ],
  },
  {
    code: "pleasures",
    name: "Prazeres",
    icon: "🎉",
    categories: [
      { name: "Lazer", icon: "🎬", groupCode: "pleasures", behavior: "refill_up" },
      { name: "Hobbies", icon: "🎮", groupCode: "pleasures", behavior: "refill_up" },
      { name: "Presentes", icon: "🎁", groupCode: "pleasures", behavior: "refill_up" },
    ],
  },
  {
    code: "investments",
    name: "Investimentos",
    icon: "💰",
    categories: [
      { name: "Reserva de Emergência", icon: "🛡️", groupCode: "investments", behavior: "set_aside" },
      { name: "Investimentos", icon: "📈", groupCode: "investments", behavior: "set_aside" },
      { name: "Previdência", icon: "🏦", groupCode: "investments", behavior: "set_aside" },
    ],
  },
];

interface CategoryWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingCategories?: string[]; // Names of existing categories to pre-check
  groups: Array<{ id: string; code: string }>;
  budgetId: string;
}

export function CategoryWizard({
  isOpen,
  onClose,
  onComplete,
  existingCategories = [],
  groups,
  budgetId,
}: CategoryWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(existingCategories)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentGroup = CATEGORY_SUGGESTIONS[step];
  const isLastStep = step === CATEGORY_SUGGESTIONS.length - 1;

  const toggleCategory = (categoryName: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const selectAllInGroup = () => {
    const newSelected = new Set(selectedCategories);
    currentGroup.categories.forEach((cat) => {
      newSelected.add(cat.name);
    });
    setSelectedCategories(newSelected);
  };

  const deselectAllInGroup = () => {
    const newSelected = new Set(selectedCategories);
    currentGroup.categories.forEach((cat) => {
      newSelected.delete(cat.name);
    });
    setSelectedCategories(newSelected);
  };

  const allInGroupSelected = currentGroup?.categories.every((cat) =>
    selectedCategories.has(cat.name)
  );

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    // Get all selected categories that need to be created
    const categoriesToCreate: CategorySuggestion[] = [];

    CATEGORY_SUGGESTIONS.forEach((group) => {
      group.categories.forEach((cat) => {
        if (
          selectedCategories.has(cat.name) &&
          !existingCategories.includes(cat.name)
        ) {
          categoriesToCreate.push(cat);
        }
      });
    });

    if (categoriesToCreate.length === 0) {
      onComplete();
      return;
    }

    setIsSubmitting(true);

    try {
      // Create categories in batch
      for (const cat of categoriesToCreate) {
        const group = groups.find((g) => g.code === cat.groupCode);
        if (!group) continue;

        const response = await fetch("/api/app/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cat.name,
            icon: cat.icon,
            groupId: group.id,
            behavior: cat.behavior,
            budgetId,
          }),
        });

        if (!response.ok) {
          console.error(`Failed to create category: ${cat.name}`);
        }
      }

      toast.success(`${categoriesToCreate.length} categorias criadas!`);
      onComplete();
    } catch (error) {
      console.error("Error creating categories:", error);
      toast.error("Erro ao criar categorias");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  if (!currentGroup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Configurar Categorias</DialogTitle>
          </div>
          <DialogDescription>
            Selecione as categorias que fazem sentido para você. Você pode
            personalizar depois.
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-1 py-2">
          {CATEGORY_SUGGESTIONS.map((group, index) => (
            <div
              key={group.code}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index < step
                  ? "bg-primary"
                  : index === step
                    ? "bg-primary/50"
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Current group */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentGroup.icon}</span>
              <div>
                <h3 className="font-semibold">{currentGroup.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Passo {step + 1} de {CATEGORY_SUGGESTIONS.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={allInGroupSelected ? deselectAllInGroup : selectAllInGroup}
              className="text-xs"
            >
              {allInGroupSelected ? "Desmarcar todos" : "Selecionar todos"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
            {currentGroup.categories.map((category) => {
              const isSelected = selectedCategories.has(category.name);
              const isExisting = existingCategories.includes(category.name);

              return (
                <div
                  key={category.name}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                    isExisting && "opacity-60"
                  )}
                  onClick={() => !isExisting && toggleCategory(category.name)}
                >
                  <span className="text-xl">{category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {category.name}
                    </div>
                    {isExisting && (
                      <div className="text-xs text-muted-foreground">
                        Já existe
                      </div>
                    )}
                  </div>
                  <Checkbox
                    checked={isSelected}
                    disabled={isExisting}
                    onCheckedChange={() => toggleCategory(category.name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              {selectedCategories.size > 0 ? "Pular" : "Cancelar"}
            </Button>
            <Button onClick={handleNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : isLastStep ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Concluir ({selectedCategories.size - existingCategories.length})
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
