"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/components/ui/compact-table";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Loader2,
  FolderOpen,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  groupId: string;
  behavior: "set_aside" | "refill_up";
  plannedAmount: number;
  displayOrder: number;
}

interface Group {
  id: string;
  code: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  displayOrder: number;
  categories: Category[];
}

interface Budget {
  id: string;
  name: string;
}

interface CategoryFormData {
  name: string;
  icon: string;
  groupId: string;
  behavior: "set_aside" | "refill_up";
}

const GRID_COLS = "24px 1fr 120px";

// Emoji categories for picker
const EMOJI_CATEGORIES = {
  recent: { icon: "🕐", label: "Recentes", emojis: ["📌", "🛒", "🍔", "🚗", "🏠", "💪", "🎬", "💰"] },
  food: { icon: "🍔", label: "Comida", emojis: ["🛒", "🍔", "🍕", "🍜", "🍣", "🥗", "☕", "🍺", "🍷", "🥖", "🥩", "🛵", "🍽️", "🍰", "🧁"] },
  transport: { icon: "🚗", label: "Transporte", emojis: ["🚗", "🚌", "🚇", "✈️", "🚲", "⛽", "🅿️", "🚙", "🔧", "🛻", "🏍️", "🚕"] },
  home: { icon: "🏠", label: "Casa", emojis: ["🏠", "🏢", "💧", "💡", "🔥", "📶", "📱", "🧹", "🛋️", "🛏️", "🚿", "🧺", "🔑", "🏡"] },
  health: { icon: "💪", label: "Saúde", emojis: ["💪", "🏥", "💊", "🦷", "🧠", "🏃", "🧘", "💉", "🩺", "👁️", "❤️‍🩹", "🏋️"] },
  entertainment: { icon: "🎬", label: "Lazer", emojis: ["🎬", "📺", "🎵", "🎮", "📚", "✈️", "🏨", "🎭", "🎪", "🎯", "🎳", "⚽", "🏖️", "🎸"] },
  money: { icon: "💰", label: "Dinheiro", emojis: ["💰", "💳", "🧾", "🛡️", "❤️", "📈", "💵", "🏦", "💎", "🪙", "📊", "🎰"] },
  other: { icon: "📦", label: "Outros", emojis: ["📌", "👕", "👟", "💅", "🎁", "🐕", "🐱", "📖", "✏️", "🌍", "💼", "💻", "👶", "🧸", "🍼", "📦"] },
};

export default function CategoriesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { isExpanded, toggleGroup, setExpandedGroups } = useExpandedGroups([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    icon: "",
    groupId: "",
    behavior: "refill_up",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>("recent");

  const fetchData = useCallback(async () => {
    try {
      const [categoriesRes, budgetsRes] = await Promise.all([
        fetch("/api/app/categories"),
        fetch("/api/app/budgets"),
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setGroups(data.groups || []);
        // Expand all groups by default
        setExpandedGroups(data.groups?.map((g: Group) => g.id) || []);
      }

      if (budgetsRes.ok) {
        const data = await budgetsRes.json();
        setBudgets(data.budgets || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateForm = (groupId?: string) => {
    setFormData({
      name: "",
      icon: "",
      groupId: groupId || groups[0]?.id || "",
      behavior: "refill_up",
    });
    setEditingCategory(null);
    setEmojiCategory("recent");
    setIsFormOpen(true);
  };

  const openEditForm = (category: Category) => {
    setFormData({
      name: category.name,
      icon: category.icon || "",
      groupId: category.groupId,
      behavior: category.behavior,
    });
    setEditingCategory(category);
    setEmojiCategory("recent");
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.groupId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (budgets.length === 0) {
      toast.error("Nenhum orçamento encontrado");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const response = await fetch(`/api/app/categories/${editingCategory.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            icon: formData.icon || null,
            behavior: formData.behavior,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao atualizar categoria");
        }

        toast.success("Categoria atualizada!");
      } else {
        const response = await fetch("/api/app/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budgetId: budgets[0].id,
            groupId: formData.groupId,
            name: formData.name,
            icon: formData.icon || null,
            behavior: formData.behavior,
            suggestIcon: !formData.icon,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao criar categoria");
        }

        toast.success("Categoria criada!");
      }

      setIsFormOpen(false);
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    try {
      const response = await fetch(`/api/app/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir categoria");
      }

      toast.success("Categoria excluída!");
      setDeletingCategory(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir");
    }
  };

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      categories: group.categories.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter(
      (g) =>
        g.categories.length > 0 ||
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const totalCategories = groups.reduce((sum, g) => sum + g.categories.length, 0);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Organize suas despesas e receitas em categorias
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/app/categories/setup")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Button>
          <Button size="sm" onClick={() => openCreateForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Categoria
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderOpen className="h-4 w-4" />
            <span>Grupos</span>
          </div>
          <div className="mt-1 text-xl font-bold">{groups.length}</div>
        </div>

        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-lg">📌</span>
            <span>Categorias</span>
          </div>
          <div className="mt-1 text-xl font-bold">{totalCategories}</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar categorias..."
          className="pl-10 h-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Compact Categories Table */}
      {groups.length > 0 ? (
        <div className="rounded-lg border bg-card">
          {/* Table Header */}
          <div
            className={COMPACT_TABLE_STYLES.header}
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div></div>
            <div>Categoria</div>
            <div>Comportamento</div>
          </div>

          {/* Grouped by Group */}
          {filteredGroups.map((group) => {
            const expanded = isExpanded(group.id);

            return (
              <div key={group.id}>
                <GroupToggleRow
                  isExpanded={expanded}
                  onToggle={() => toggleGroup(group.id)}
                  icon={group.icon || "📁"}
                  label={group.name}
                  count={group.categories.length}
                  gridCols={GRID_COLS}
                  emptyColsCount={0}
                  summary={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateForm(group.id);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  }
                />

                {/* Category Rows */}
                {expanded && (
                  <>
                    {group.categories.length > 0 ? (
                      group.categories.map((category) => (
                        <div
                          key={category.id}
                          className={COMPACT_TABLE_STYLES.itemRow}
                          style={{ gridTemplateColumns: GRID_COLS }}
                        >
                          <div className="flex items-center justify-center">
                            <span className="text-base">
                              {category.icon || "📌"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="truncate font-medium">
                              {category.name}
                            </span>
                            <HoverActions
                              onEdit={() => openEditForm(category)}
                              onDelete={() => setDeletingCategory(category)}
                              editTitle="Editar categoria"
                              deleteTitle="Excluir categoria"
                            />
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {category.behavior === "set_aside" ? (
                              <span className="bg-muted px-1.5 py-0.5 rounded">
                                Acumula
                              </span>
                            ) : (
                              <span>Recarrega</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                        Nenhuma categoria neste grupo
                      </div>
                    )}
                    <div className="px-4 py-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground"
                        onClick={() => openCreateForm(group.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Adicionar categoria
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">Nenhuma categoria configurada</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete o onboarding para criar categorias automaticamente ou
            adicione manualmente
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/app/categories/setup")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurar Categorias
            </Button>
            <Button onClick={() => openCreateForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Category Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Atualize os dados da categoria"
                : "Crie uma nova categoria para organizar suas despesas"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Ex: Alimentação"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="space-y-3">
                {/* Selected emoji display */}
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center text-xl">
                    {formData.icon || "📌"}
                  </div>
                  {formData.icon && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, icon: "" })}
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Emoji category tabs */}
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(EMOJI_CATEGORIES).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setEmojiCategory(key as keyof typeof EMOJI_CATEGORIES)
                      }
                      className={cn(
                        "px-2 py-1 rounded text-sm flex items-center gap-1 transition-colors",
                        emojiCategory === key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      <span>{cat.icon}</span>
                      <span className="hidden sm:inline">{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Emoji grid */}
                <div className="grid grid-cols-8 gap-1 p-2 border rounded-lg bg-muted/30 max-h-32 overflow-y-auto">
                  {EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={cn(
                        "h-8 w-8 rounded flex items-center justify-center text-lg hover:bg-muted transition-colors",
                        formData.icon === emoji && "bg-primary/20 ring-2 ring-primary"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!editingCategory && (
              <div className="space-y-2">
                <Label htmlFor="group">Grupo</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, groupId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.icon} {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="behavior">Comportamento</Label>
              <Select
                value={formData.behavior}
                onValueChange={(value: "set_aside" | "refill_up") =>
                  setFormData({ ...formData, behavior: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="refill_up">
                    Recarregar (o valor é renovado todo mês)
                  </SelectItem>
                  <SelectItem value="set_aside">
                    Acumular (o valor não usado passa para o próximo mês)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.behavior === "refill_up"
                  ? "O saldo é zerado e recarregado todo mês."
                  : "O saldo não usado acumula para o próximo mês."}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCategory ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria &quot;
              {deletingCategory?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
