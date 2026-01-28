"use client";

import { Plus, Wallet } from "lucide-react";
import {
  PageHeader,
  PageContent,
  EmptyState,
  DeleteConfirmDialog,
  LoadingState,
  SummaryCard,
  ResponsiveButton,
} from "@/shared/molecules";
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
  useExpandedGroups,
} from "@/shared/ui/compact-table";
import { formatCentsToDisplay, formatCentsToCurrency } from "@/shared/ui/currency-input";
import { useTutorial } from "@/shared/tutorial/tutorial-provider";
import {
  useIncomePageData,
  useIncomeSourcePageForm,
  INCOME_TYPE_CONFIG_PLURAL,
  FREQUENCY_LABELS,
  type IncomeType,
} from "@/features/income";
import { IncomeSourcePageFormModal } from "@/features/income";

// Grid columns: icon, name, member, day, value
// Member and Day columns hidden on mobile
const GRID_COLS_DESKTOP = "24px 1fr 100px 80px 100px";

export default function IncomePage() {
  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();
  const { isExpanded, toggleGroup } = useExpandedGroups([
    "salary",
    "benefit",
    "freelance",
    "rental",
    "investment",
    "other",
  ]);

  const {
    budgets,
    members,
    accounts,
    incomeSources,
    totalMonthlyIncome,
    typesWithIncome,
    isLoading,
    refresh,
  } = useIncomePageData();

  const form = useIncomeSourcePageForm({
    budgetId: budgets[0]?.id,
    members,
    accounts,
    onSuccess: refresh,
    onTutorialAction: isTutorialActive ? () => notifyActionCompleted("hasIncome") : undefined,
  });

  if (isLoading) {
    return <LoadingState fullHeight />;
  }

  return (
    <PageContent>
      {/* Header */}
      <PageHeader
        title="Rendas"
        description="Gerencie suas fontes de renda"
        actions={
          <ResponsiveButton
            onClick={() => form.openCreate()}
            size="sm"
            icon={<Plus />}
            data-tutorial="add-income-button"
          >
            Nova Renda
          </ResponsiveButton>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4" data-tutorial="income-summary">
        <SummaryCard
          icon={<Wallet className="h-4 w-4 text-green-500" />}
          label="Renda Mensal Total"
          value={formatCentsToCurrency(totalMonthlyIncome)}
          valueColor="positive"
        />
        <SummaryCard
          icon={<span className="text-lg">💰</span>}
          label="Fontes de Renda"
          value={incomeSources.length.toString()}
        />
      </div>

      {/* Compact Income Table */}
      {incomeSources.length > 0 ? (
        <div className="rounded-lg border bg-card overflow-x-auto">
          {/* Table Header */}
          <div className="min-w-[400px]">
            <div
              className={COMPACT_TABLE_STYLES.header}
              style={{ gridTemplateColumns: GRID_COLS_DESKTOP }}
            >
              <div></div>
              <div>Fonte</div>
              <div className="hidden sm:block">Quem Recebe</div>
              <div className="hidden sm:block">Dia</div>
              <div className="text-right">Valor</div>
            </div>

          {/* Grouped by Type */}
          {typesWithIncome.map(([type, sources]) => {
            const config = INCOME_TYPE_CONFIG_PLURAL[type];
            const expanded = isExpanded(type);
            const typeTotal = sources.reduce((sum, s) => sum + s.amount, 0);

            return (
              <div key={type}>
                <GroupToggleRow
                  isExpanded={expanded}
                  onToggle={() => toggleGroup(type)}
                  icon={config.icon}
                  label={config.label}
                  count={sources.length}
                  gridCols={GRID_COLS_DESKTOP}
                  emptyColsCount={2}
                  summary={`+${formatCentsToDisplay(typeTotal)}`}
                  summaryClassName="text-green-600"
                />

                {/* Income Source Rows */}
                {expanded &&
                  sources.map((source) => (
                    <div
                      key={source.id}
                      className={COMPACT_TABLE_STYLES.itemRow}
                      style={{ gridTemplateColumns: GRID_COLS_DESKTOP }}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-base">{config.icon}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate font-medium">{source.name}</span>
                        <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {FREQUENCY_LABELS[source.frequency]}
                        </span>
                        <HoverActions
                          onEdit={() => form.openEdit(source)}
                          onDelete={() => form.setDeletingSource(source)}
                          editTitle="Editar fonte de renda"
                          deleteTitle="Excluir fonte de renda"
                        />
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                        {source.member ? (
                          <>
                            <span
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: source.member.color || "#6366f1",
                              }}
                            />
                            <span className="truncate text-xs">
                              {source.member.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </div>
                      <div className="hidden sm:block text-muted-foreground">
                        {source.dayOfMonth ? (
                          <span className="text-xs">Dia {source.dayOfMonth}</span>
                        ) : (
                          <span className="text-xs">-</span>
                        )}
                      </div>
                      <div className="text-right font-medium tabular-nums text-green-600">
                        +{formatCentsToDisplay(source.amount)}
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={<Wallet className="h-6 w-6 text-muted-foreground" />}
          title="Nenhuma renda configurada"
          description="Adicione suas fontes de renda para começar a planejar seu orçamento"
          action={{
            label: "Adicionar Renda",
            onClick: () => form.openCreate(),
            icon: <Plus className="mr-2 h-4 w-4" />,
          }}
        />
      )}

      {/* Create/Edit Modal */}
      <IncomeSourcePageFormModal
        isOpen={form.isFormOpen}
        editingSource={form.editingSource}
        formData={form.formData}
        errors={form.errors}
        isSubmitting={form.isSubmitting}
        filteredAccounts={form.filteredAccounts}
        members={members}
        onClose={form.closeForm}
        onUpdateField={form.updateField}
        onSubmit={form.submit}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!form.deletingSource}
        onOpenChange={(open) => !open && form.setDeletingSource(null)}
        onConfirm={form.confirmDelete}
        title="Excluir fonte de renda?"
        description={`Tem certeza que deseja excluir "${form.deletingSource?.name}"? Esta ação não pode ser desfeita.`}
      />
    </PageContent>
  );
}
