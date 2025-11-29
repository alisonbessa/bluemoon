"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Check,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Group {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  description?: string | null;
}

interface SuggestedCategory {
  name: string;
  icon: string;
  groupCode: string;
  selected: boolean;
}

interface CustomCategory {
  name: string;
  icon: string;
  groupCode: string;
}

interface Budget {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  type: string;
}

// Suggested categories per group
const suggestedCategoriesByGroup: Record<string, Array<{ name: string; icon: string }>> = {
  essential: [
    { name: "Moradia", icon: "🏠" },
    { name: "Aluguel/Financiamento", icon: "🔑" },
    { name: "Condomínio", icon: "🏢" },
    { name: "Água", icon: "💧" },
    { name: "Luz", icon: "💡" },
    { name: "Gás", icon: "🔥" },
    { name: "Internet", icon: "📶" },
    { name: "Telefone", icon: "📱" },
    { name: "Mercado", icon: "🛒" },
    { name: "Transporte", icon: "🚗" },
    { name: "Combustível", icon: "⛽" },
    { name: "Estacionamento", icon: "🅿️" },
    { name: "Saúde", icon: "💊" },
    { name: "Plano de Saúde", icon: "🏥" },
    { name: "Educação", icon: "📚" },
    { name: "Escola/Faculdade", icon: "🎓" },
    { name: "Seguros", icon: "🛡️" },
    { name: "IPTU/IPVA", icon: "📋" },
  ],
  lifestyle: [
    { name: "Alimentação Fora", icon: "🍽️" },
    { name: "Delivery", icon: "🛵" },
    { name: "Café/Lanche", icon: "☕" },
    { name: "Vestuário", icon: "👕" },
    { name: "Calçados", icon: "👟" },
    { name: "Streaming", icon: "📺" },
    { name: "Spotify/Música", icon: "🎵" },
    { name: "Academia", icon: "💪" },
    { name: "Beleza/Cuidados", icon: "💅" },
    { name: "Cabelo/Barbearia", icon: "💇" },
    { name: "Pet", icon: "🐕" },
    { name: "Casa/Decoração", icon: "🪴" },
    { name: "Presentes", icon: "🎁" },
    { name: "Assinaturas", icon: "📦" },
  ],
  pleasures: [
    { name: "Lazer", icon: "🎮" },
    { name: "Cinema/Teatro", icon: "🎬" },
    { name: "Bares/Drinks", icon: "🍺" },
    { name: "Hobbies", icon: "🎨" },
    { name: "Livros/Cursos", icon: "📖" },
    { name: "Jogos", icon: "🎲" },
    { name: "Shows/Eventos", icon: "🎤" },
  ],
  investments: [
    { name: "Reserva de Emergência", icon: "🏦" },
    { name: "Previdência", icon: "👴" },
    { name: "Investimentos", icon: "📈" },
    { name: "Poupança", icon: "🐷" },
    { name: "Crypto", icon: "₿" },
  ],
  goals: [
    { name: "Viagem", icon: "✈️" },
    { name: "Carro Novo", icon: "🚙" },
    { name: "Casa/Apartamento", icon: "🏡" },
    { name: "Casamento", icon: "💒" },
    { name: "Reforma", icon: "🔨" },
    { name: "Eletrônicos", icon: "💻" },
    { name: "Festa", icon: "🎊" },
  ],
};

export default function CategoriesSetupPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<SuggestedCategory[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, budgetsRes, categoriesRes, membersRes] = await Promise.all([
        fetch("/api/app/groups"),
        fetch("/api/app/budgets"),
        fetch("/api/app/categories"),
        fetch("/api/app/members"),
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        // Get existing category names to avoid duplicates
        const names = data.flatCategories?.map((c: { name: string }) => c.name.toLowerCase()) || [];
        setExistingCategories(names);
      }

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Initialize selected categories when groups load
  useEffect(() => {
    if (groups.length > 0 && selectedCategories.length === 0) {
      const initial: SuggestedCategory[] = [];
      groups.forEach((group) => {
        const suggestions = suggestedCategoriesByGroup[group.code] || [];
        suggestions.forEach((cat) => {
          const alreadyExists = existingCategories.includes(cat.name.toLowerCase());
          initial.push({
            ...cat,
            groupCode: group.code,
            selected: !alreadyExists, // Pre-select if not already existing
          });
        });
      });
      setSelectedCategories(initial);
    }
  }, [groups, existingCategories, selectedCategories.length]);

  const currentGroup = groups[currentStep];
  const currentSuggestions = selectedCategories.filter(
    (cat) => cat.groupCode === currentGroup?.code
  );
  const currentCustom = customCategories.filter(
    (cat) => cat.groupCode === currentGroup?.code
  );

  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) =>
      prev.map((cat) =>
        cat.name === name && cat.groupCode === currentGroup?.code
          ? { ...cat, selected: !cat.selected }
          : cat
      )
    );
  };

  const addCustomCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error("Digite um nome para a categoria");
      return;
    }

    // Check if already exists
    const exists = [...selectedCategories, ...customCategories].some(
      (cat) =>
        cat.name.toLowerCase() === newCategoryName.toLowerCase() &&
        cat.groupCode === currentGroup?.code
    );

    if (exists) {
      toast.error("Categoria já existe");
      return;
    }

    setCustomCategories((prev) => [
      ...prev,
      {
        name: newCategoryName.trim(),
        icon: newCategoryIcon.trim() || "📌",
        groupCode: currentGroup?.code || "",
      },
    ]);
    setNewCategoryName("");
    setNewCategoryIcon("");
  };

  const removeCustomCategory = (name: string) => {
    setCustomCategories((prev) =>
      prev.filter(
        (cat) => !(cat.name === name && cat.groupCode === currentGroup?.code)
      )
    );
  };

  const handleNext = () => {
    if (currentStep < groups.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    const budgetId = budgets[0].id;

    // Collect all selected and custom categories
    const categoriesToCreate = [
      ...selectedCategories
        .filter((cat) => cat.selected)
        .map((cat) => ({
          name: cat.name,
          icon: cat.icon,
          groupCode: cat.groupCode,
        })),
      ...customCategories,
    ];

    if (categoriesToCreate.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }

    setIsSaving(true);
    let created = 0;
    let skipped = 0;

    try {
      for (const cat of categoriesToCreate) {
        // Skip if already exists
        if (existingCategories.includes(cat.name.toLowerCase())) {
          skipped++;
          continue;
        }

        const group = groups.find((g) => g.code === cat.groupCode);
        if (!group) continue;

        const response = await fetch("/api/app/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budgetId,
            groupId: group.id,
            name: cat.name,
            icon: cat.icon,
            behavior: cat.groupCode === "investments" || cat.groupCode === "goals" ? "set_aside" : "refill_up",
          }),
        });

        if (response.ok) {
          created++;
        }
      }

      if (created > 0) {
        toast.success(`${created} categorias criadas com sucesso!`);
      }
      if (skipped > 0) {
        toast.info(`${skipped} categorias já existiam e foram ignoradas`);
      }

      router.push("/app/categories");
    } catch (error) {
      console.error("Error creating categories:", error);
      toast.error("Erro ao criar categorias");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount =
    selectedCategories.filter((c) => c.selected).length + customCategories.length;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/app/categories")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Configure suas Categorias</h1>
        </div>
        <p className="text-muted-foreground">
          Selecione as categorias que fazem sentido para você. Você pode
          adicionar, remover ou editar depois.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {groups.map((group, index) => (
          <div
            key={group.id}
            className={cn(
              "flex-1 h-2 rounded-full transition-colors",
              index < currentStep
                ? "bg-primary"
                : index === currentStep
                ? "bg-primary/50"
                : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Current Group */}
      {currentGroup && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentGroup.icon}</span>
              <div>
                <CardTitle>{currentGroup.name}</CardTitle>
                <CardDescription>{currentGroup.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Suggested Categories */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Categorias Sugeridas
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {currentSuggestions.map((cat) => {
                  const alreadyExists = existingCategories.includes(
                    cat.name.toLowerCase()
                  );
                  return (
                    <div
                      key={cat.name}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                        alreadyExists
                          ? "bg-muted/50 opacity-50 cursor-not-allowed"
                          : cat.selected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => !alreadyExists && toggleCategory(cat.name)}
                    >
                      <Checkbox
                        checked={cat.selected || alreadyExists}
                        disabled={alreadyExists}
                        className="pointer-events-none"
                      />
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm font-medium truncate">
                        {cat.name}
                      </span>
                      {alreadyExists && (
                        <Check className="h-3 w-3 text-green-500 ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Categories */}
            {currentCustom.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Suas Categorias Personalizadas
                </Label>
                <div className="flex flex-wrap gap-2">
                  {currentCustom.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary bg-primary/5"
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 hover:bg-destructive/20"
                        onClick={() => removeCustomCategory(cat.name)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Custom Category */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-medium">
                Adicionar Categoria Personalizada
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Emoji"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  className="w-16"
                />
                <Input
                  placeholder="Nome da categoria"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomCategory()}
                  className="flex-1"
                />
                <Button variant="outline" onClick={addCustomCategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        <div className="text-sm text-muted-foreground">
          {selectedCount} categorias selecionadas
        </div>

        {currentStep < groups.length - 1 ? (
          <Button onClick={handleNext}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Categorias
            <Check className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
