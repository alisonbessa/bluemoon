"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/shared/ui/compact-table";
import { Plus, FolderOpen, Wand2 } from "lucide-react";
import {
  PageHeader,
  EmptyState,
  DeleteConfirmDialog,
  LoadingState,
  SummaryCard,
} from "@/shared/molecules";
import {
  useCategoriesPageData,
  useCategoryPageForm,
  CategoryWizard,
  CategoryPageFormModal,
} from "@/features/categories";

const GRID_COLS = "24px 1fr 120px";

export default function CategoriesPage() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const { isExpanded, toggleGroup, setExpandedGroups } = useExpandedGroups([]);

  const {
    groups,
    budgets,
    totalCategories,
    isLoading,
    refresh,
  } = useCategoriesPageData();

  const form = useCategoryPageForm({
    budgetId: budgets[0]?.id,
    groups,
    onSuccess: refresh,
  });

  // Expand all groups by default when data loads
  useEffect(() => {
    if (groups.length > 0) {
      setExpandedGroups(groups.map((g) => g.id));
    }
  }, [groups, setExpandedGroups]);

  if (isLoading) {
    return <LoadingState fullHeight />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <PageHeader
        title="Categorias"
        description="Organize suas despesas e receitas em categorias"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
          >
            <Wand2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Assistente</span>
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <SummaryCard
          icon={<FolderOpen className="h-full w-full" />}
          label="Grupos"
          value={String(groups.length)}
        />
        <SummaryCard
          icon={<span className="text-lg">📌</span>}
          label="Categorias"
          value={String(totalCategories)}
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
          {groups.map((group, index) => {
            const expanded = isExpanded(group.id);

            return (
              <div key={group.id} data-tutorial={index === 0 ? "category-groups" : undefined}>
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
                        form.openCreate(group.id);
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
                              onEdit={() => form.openEdit(category)}
                              onDelete={() => form.setDeletingCategory(category)}
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
                              <span>Recorrente</span>
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
                        onClick={() => form.openCreate(group.id)}
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
        <EmptyState
          icon={<FolderOpen className="h-6 w-6 text-muted-foreground" />}
          title="Nenhuma categoria configurada"
          description="Complete o onboarding para criar categorias automaticamente ou adicione manualmente"
          action={{
            label: "Configurar Categorias",
            onClick: () => setIsWizardOpen(true),
            icon: <Wand2 className="mr-2 h-4 w-4" />,
          }}
        />
      )}

      {/* Create/Edit Category Modal */}
      <CategoryPageFormModal
        isOpen={form.isFormOpen}
        editingCategory={form.editingCategory}
        formData={form.formData}
        isSubmitting={form.isSubmitting}
        groups={groups}
        onClose={form.closeForm}
        onUpdateField={form.updateField}
        onSubmit={form.submit}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!form.deletingCategory}
        onOpenChange={(open) => !open && form.setDeletingCategory(null)}
        onConfirm={form.confirmDelete}
        title="Excluir categoria?"
        description={`Tem certeza que deseja excluir a categoria "${form.deletingCategory?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />

      {/* Category Wizard */}
      <CategoryWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={() => {
          setIsWizardOpen(false);
          refresh();
        }}
        existingCategories={groups.flatMap((g) => g.categories.map((c) => c.name))}
        groups={groups.map((g) => ({ id: g.id, code: g.code }))}
        budgetId={budgets[0]?.id || ""}
      />
    </div>
  );
}
