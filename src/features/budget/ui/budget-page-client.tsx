'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Loader2, PiggyBank, User } from 'lucide-react';
import { GoalFormModal } from '@/features/goals';
import { useTutorial } from '@/shared/tutorial/tutorial-provider';
import { PageHeader } from '@/shared/molecules';
import { useUser } from '@/shared/hooks/use-current-user';
import { useViewMode } from '@/shared/providers/view-mode-provider';

import {
  useBudgetPeriod,
  useBudgetUIState,
  useBudgetPageData,
  useBudgetSections,
  useAllocationForm,
  useCategoryForm,
  useIncomeAllocationForm,
  useIncomeSourceForm,
  useBudgetActions,
} from '@/features/budget/hooks';

import type { BudgetSection } from '@/features/budget/hooks';

import {
  BudgetHeader,
  BudgetFilters,
  IncomeSectionAccordion,
  ExpensesSectionAccordion,
  GoalsSectionAccordion,
  AllocationModal,
  CategoryFormModal,
  CategoryDeleteDialog,
  IncomeAllocationModal,
  IncomeSourceFormModal,
  IncomeSourceDeleteDialog,
  IncomeEditScopeDialog,
  CopyAllocationsModal,
  CopyHintModal,
} from '@/features/budget/ui';

import { formatCurrency } from '@/shared/lib/formatters';

import type {
  IncomeSource,
  IncomeSourceData,
  Account,
} from '@/features/budget/types';

export interface BudgetPageClientProps {
  initialYear: number;
  initialMonth: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialAllocationsData: Record<string, any> | null;
}

export function BudgetPageClient({
  initialYear,
  initialMonth,
  initialAllocationsData,
}: BudgetPageClientProps) {
  const router = useRouter();
  const { user } = useUser();
  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();
  const { viewMode, setHasContributionModel } = useViewMode();

  // Period navigation
  const {
    year: currentYear,
    month: currentMonth,
    setYear,
    setMonth,
  } = useBudgetPeriod();

  // UI state
  const uiState = useBudgetUIState();

  // Data fetching via SWR
  // Pass initialAllocationsData as fallback only for the initial month
  const isInitialMonth = currentYear === initialYear && currentMonth === initialMonth;
  const {
    budgets,
    primaryBudgetId: budgetId,
    members,
    accounts,
    groupsData,
    totals,
    incomeData,
    totalIncome,
    totalContribution,
    hasContributionModel,
    hasPreviousMonthData,
    goals,
    isLoading,
    refreshData,
  } = useBudgetPageData(currentYear, currentMonth, {
    fallbackAllocationsData: isInitialMonth ? initialAllocationsData as never : undefined,
  });

  // Sync hasContributionModel to the global ViewMode context
  useEffect(() => {
    if (!isLoading) {
      setHasContributionModel(hasContributionModel);
    }
  }, [hasContributionModel, isLoading, setHasContributionModel]);

  // Current user for member matching
  const userMemberId = useMemo(
    () => members.find((m) => m.userId === user?.id)?.id ?? null,
    [members, user?.id]
  );

  // Split data into sections based on global viewMode
  const {
    sections,
    aggregatedTotals,
    aggregatedTotalGoals,
    aggregatedTotalIncome,
  } = useBudgetSections({
    groupsData,
    totals,
    incomeData,
    totalIncome,
    totalContribution,
    hasContributionModel,
    goals,
    userMemberId,
    members,
    viewMode,
  });

  // Local UI state
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [showCopyHintModal, setShowCopyHintModal] = useState(false);
  const [confirmingGoalId, setConfirmingGoalId] = useState<string | null>(null);

  // Income edit scope dialog state
  const [scopeDialog, setScopeDialog] = useState<{
    source: IncomeSource;
    item: IncomeSourceData;
  } | null>(null);

  // Show copy hint modal when no allocations exist for current month
  useEffect(() => {
    if (isLoading || groupsData.length === 0) return;
    if (totals.allocated > 0 || !hasPreviousMonthData) return;

    const dismissedKey = `copy-hint-dismissed-${currentYear}-${currentMonth}`;
    const wasDismissed = localStorage.getItem(dismissedKey);

    if (!wasDismissed) {
      setShowCopyHintModal(true);
    }
  }, [isLoading, groupsData.length, totals.allocated, currentYear, currentMonth, hasPreviousMonthData]);

  const dismissCopyHintModal = () => {
    const dismissedKey = `copy-hint-dismissed-${currentYear}-${currentMonth}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowCopyHintModal(false);
  };

  // Month change handler
  const handleMonthChange = (year: number, month: number) => {
    setYear(year);
    setMonth(month);
  };

  // Form hooks
  const allocationForm = useAllocationForm({
    budgetId,
    year: currentYear,
    month: currentMonth,
    onSuccess: () => {
      refreshData();
      if (isTutorialActive) {
        notifyActionCompleted('hasAllocations');
      }
    },
  });

  const categoryForm = useCategoryForm({
    budgetId,
    onSuccess: refreshData,
  });

  const incomeAllocationForm = useIncomeAllocationForm({
    budgetId,
    year: currentYear,
    month: currentMonth,
    onSuccess: refreshData,
  });

  const incomeSourceForm = useIncomeSourceForm({
    budgetId,
    members,
    accounts,
    onSuccess: refreshData,
  });

  // Ignore income source for this month (set planned: 0)
  const handleIgnoreIncome = useCallback(async (item: IncomeSourceData) => {
    if (!budgetId) return;
    await fetch('/api/app/income-allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budgetId,
        incomeSourceId: item.incomeSource.id,
        year: currentYear,
        month: currentMonth,
        planned: 0,
      }),
    });
    refreshData();
  }, [budgetId, currentYear, currentMonth, refreshData]);

  // Restore income source to its default for this month (removes override)
  const handleRestoreIncome = useCallback(async (item: IncomeSourceData) => {
    if (!budgetId) return;
    await fetch('/api/app/income-allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        budgetId,
        incomeSourceId: item.incomeSource.id,
        year: currentYear,
        month: currentMonth,
        planned: item.defaultAmount,
      }),
    });
    refreshData();
  }, [budgetId, currentYear, currentMonth, refreshData]);

  const handleConfirmGoal = useCallback(async (goal: { id: string; fromAccountId?: string | null; monthlyTarget: number }) => {
    if (!goal.fromAccountId || goal.monthlyTarget <= 0) return;
    setConfirmingGoalId(goal.id);
    try {
      const response = await fetch(`/api/app/goals/${goal.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: goal.monthlyTarget,
          year: currentYear,
          month: currentMonth,
          fromAccountId: goal.fromAccountId,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        const { toast } = await import('sonner');
        toast.error(err.message || 'Erro ao confirmar meta');
        return;
      }
      const { toast } = await import('sonner');
      toast.success('Contribuicao confirmada!');
      refreshData();
    } catch {
      const { toast } = await import('sonner');
      toast.error('Erro ao confirmar meta');
    } finally {
      setConfirmingGoalId(null);
    }
  }, [currentYear, currentMonth, refreshData]);

  const budgetActions = useBudgetActions({
    budgetId,
    year: currentYear,
    month: currentMonth,
    onSuccess: refreshData,
  });

  // Handle copy button click
  const handleCopyClick = () => {
    if (totals.allocated > 0) {
      budgetActions.openCopyModal();
    } else {
      budgetActions.copyFromPreviousMonth('all');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No budgets
  if (budgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <PiggyBank className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Nenhum orcamento encontrado</h2>
        <p className="text-muted-foreground">Complete o onboarding para comecar</p>
        <Button onClick={() => router.push('/app')}>Ir para o Dashboard</Button>
      </div>
    );
  }

  // Check if all sections have empty groups (for empty state)
  const hasAnyGroups = sections.some((s) => s.groupsData.length > 0);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background">
        <div className="px-3 sm:px-4 pt-4 pb-2">
          <PageHeader
            title="Planejamento"
            description="Distribua sua renda entre despesas e metas"
          />
        </div>

        <BudgetHeader
          year={currentYear}
          month={currentMonth}
          onMonthChange={handleMonthChange}
          totalIncome={aggregatedTotalIncome}
          totalAllocated={aggregatedTotals.allocated}
          totalGoals={aggregatedTotalGoals}
        />

        <BudgetFilters
          hasPreviousMonthData={hasPreviousMonthData}
          previousMonthName={budgetActions.previousMonthName}
          onCopyClick={handleCopyClick}
          isCopying={budgetActions.isCopying}
          mobileViewMode={uiState.mobileViewMode}
          onViewModeChange={uiState.setMobileViewMode}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {hasAnyGroups || sections.some((s) => s.goals.length > 0) ? (
          sections.map((section) => (
            <BudgetSectionBlock
              key={section.key}
              section={section}
              uiState={uiState}
              budgetId={budgetId || ''}
              accounts={accounts}
              allocationForm={allocationForm}
              categoryForm={categoryForm}
              incomeAllocationForm={incomeAllocationForm}
              incomeSourceForm={incomeSourceForm}
              onEditIncomeSource={(source: IncomeSource, item: IncomeSourceData) => setScopeDialog({ source, item })}
              onIgnoreIncome={handleIgnoreIncome}
              onRestoreIncome={handleRestoreIncome}
              refreshData={refreshData}
              onAddGoal={() => setIsGoalFormOpen(true)}
              onConfirmGoal={handleConfirmGoal}
              confirmingGoalId={confirmingGoalId}
              hasContributionModel={hasContributionModel}
              showSectionHeaders={hasContributionModel}
              year={currentYear}
              month={currentMonth}
            />
          ))
        ) : viewMode === 'mine' ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <User className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Nenhuma categoria pessoal</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Categorias pessoais sao criadas automaticamente (ex: Prazeres) ou voce pode criar novas na pagina de categorias.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PiggyBank className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Nenhuma categoria configurada</h3>
            <Button onClick={() => router.push('/app/categories/setup')}>
              Configurar Categorias
            </Button>
          </div>
        )}

        {/* Personal reserve summary - only in "mine" viewMode with contribution model */}
        {viewMode === 'mine' && hasContributionModel && aggregatedTotalIncome > 0 && (
          <div className="px-3 sm:px-4 py-4 border-b">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                Sua reserva pessoal: <strong className="text-foreground">{formatCurrency(aggregatedTotalIncome)}</strong> por mes
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}

      {/* Allocation Modal */}
      <AllocationModal
        isOpen={allocationForm.isOpen}
        onClose={allocationForm.close}
        onSave={allocationForm.save}
        isSaving={allocationForm.isSaving}
        category={allocationForm.category}
        monthName={budgetActions.currentMonthName}
        year={currentYear}
        currentMonth={currentMonth}
        inputValue={allocationForm.inputValue}
        onInputValueChange={allocationForm.setInputValue}
        behavior={allocationForm.behavior}
        onBehaviorChange={allocationForm.setBehavior}
        frequency={allocationForm.frequency}
        onFrequencyChange={allocationForm.setFrequency}
        weekday={allocationForm.weekday}
        onWeekdayChange={allocationForm.setWeekday}
        dueDay={allocationForm.dueDay}
        onDueDayChange={allocationForm.setDueDay}
        yearMonth={allocationForm.yearMonth}
        onYearMonthChange={allocationForm.setYearMonth}
        monthlyValueDescription={allocationForm.monthlyValue.description}
      />

      {/* Category Form Modal - Create */}
      <CategoryFormModal
        mode="create"
        isOpen={categoryForm.isCreateOpen}
        onClose={categoryForm.closeCreate}
        onSave={categoryForm.saveCreate}
        isSaving={categoryForm.isCreating}
        group={groupsData.find((g) => g.group.id === categoryForm.createGroupId)?.group ?? null}
        name={categoryForm.createName}
        onNameChange={categoryForm.setCreateName}
        icon={categoryForm.createIcon}
        onIconChange={categoryForm.setCreateIcon}
        behavior={categoryForm.createBehavior}
        onBehaviorChange={categoryForm.setCreateBehavior}
      />

      {/* Category Form Modal - Edit */}
      <CategoryFormModal
        mode="edit"
        isOpen={categoryForm.isEditOpen}
        onClose={categoryForm.closeEdit}
        onSave={categoryForm.saveEdit}
        isSaving={categoryForm.isUpdating}
        categoryName={categoryForm.editingCategory?.name ?? ''}
        name={categoryForm.editName}
        onNameChange={categoryForm.setEditName}
        icon={categoryForm.editIcon}
        onIconChange={categoryForm.setEditIcon}
      />

      {/* Category Delete Dialog */}
      <CategoryDeleteDialog
        category={categoryForm.deletingCategory}
        onClose={() => categoryForm.setDeletingCategory(null)}
        onConfirm={categoryForm.confirmDelete}
        isDeleting={categoryForm.isDeleting}
      />

      {/* Income Allocation Modal */}
      <IncomeAllocationModal
        isOpen={incomeAllocationForm.isOpen}
        onClose={incomeAllocationForm.close}
        onSave={incomeAllocationForm.save}
        isSaving={incomeAllocationForm.isSaving}
        incomeSource={incomeAllocationForm.incomeSource}
        monthName={budgetActions.currentMonthName}
        year={currentYear}
        inputValue={incomeAllocationForm.inputValue}
        onInputValueChange={incomeAllocationForm.setInputValue}
        defaultAmount={incomeAllocationForm.defaultAmount}
        isEdited={incomeAllocationForm.isEdited}
        onResetToDefault={incomeAllocationForm.resetToDefault}
      />

      {/* Income Source Form Modal */}
      <IncomeSourceFormModal
        isOpen={incomeSourceForm.isFormOpen}
        onClose={incomeSourceForm.closeForm}
        onSubmit={incomeSourceForm.submit}
        isSubmitting={incomeSourceForm.isSubmitting}
        isEditing={incomeSourceForm.isEditing}
        isForkMode={incomeSourceForm.isForkMode}
        formData={incomeSourceForm.formData}
        errors={incomeSourceForm.errors}
        members={members}
        filteredAccounts={incomeSourceForm.filteredAccounts}
        onFieldChange={incomeSourceForm.setFormField}
        currentUserMemberId={members.find(m => m.userId === user?.id)?.id}
      />

      {/* Income Source Delete Dialog */}
      <IncomeSourceDeleteDialog
        source={incomeSourceForm.deletingSource}
        onClose={() => incomeSourceForm.setDeletingSource(null)}
        onConfirm={incomeSourceForm.confirmDelete}
        isDeleting={incomeSourceForm.isDeleting}
      />

      {/* Income Edit Scope Dialog */}
      <IncomeEditScopeDialog
        source={scopeDialog?.source ?? null}
        onClose={() => setScopeDialog(null)}
        onEditAll={() => {
          if (scopeDialog) {
            incomeSourceForm.openEdit(scopeDialog.source);
            setScopeDialog(null);
          }
        }}
        onEditThisAndFuture={async () => {
          if (!scopeDialog || !budgetId) return;
          const { source, item: _item } = scopeDialog;
          setScopeDialog(null);
          // End current source at current month (exclusive)
          await fetch(`/api/app/income-sources/${source.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endYear: currentYear, endMonth: currentMonth }),
          });
          // Open create form pre-filled with source data + new start date
          incomeSourceForm.openCreateFrom(source, currentYear, currentMonth);
          refreshData();
        }}
        onEditThisMonth={() => {
          if (scopeDialog) {
            incomeAllocationForm.open(scopeDialog.item);
            setScopeDialog(null);
          }
        }}
      />

      {/* Copy Allocations Modal */}
      <CopyAllocationsModal
        open={budgetActions.isCopyModalOpen}
        onOpenChange={(open) => !open && budgetActions.closeCopyModal()}
        onConfirm={budgetActions.copyFromPreviousMonth}
        copyMode={budgetActions.copyMode}
        onCopyModeChange={budgetActions.setCopyMode}
        isCopying={budgetActions.isCopying}
        currentMonthName={budgetActions.currentMonthName}
        previousMonthName={budgetActions.previousMonthName}
      />

      {/* Copy Hint Modal */}
      <CopyHintModal
        open={showCopyHintModal}
        onDismiss={dismissCopyHintModal}
        onCopy={() => budgetActions.copyFromPreviousMonth('all')}
        isCopying={budgetActions.isCopying}
        currentMonthName={budgetActions.currentMonthName}
        previousMonthName={budgetActions.previousMonthName}
      />

      {/* Goal Form Modal */}
      <GoalFormModal
        open={isGoalFormOpen}
        onOpenChange={setIsGoalFormOpen}
        budgetId={budgetId || ''}
        members={members}
        currentUserMemberId={userMemberId ?? undefined}
        onSuccess={refreshData}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BudgetSectionBlock - renders a single section (income + expenses + goals)
// ---------------------------------------------------------------------------

interface BudgetSectionBlockProps {
  section: BudgetSection;
  uiState: ReturnType<typeof useBudgetUIState>;
  budgetId: string;
  accounts: Account[];
  allocationForm: ReturnType<typeof useAllocationForm>;
  categoryForm: ReturnType<typeof useCategoryForm>;
  incomeAllocationForm: ReturnType<typeof useIncomeAllocationForm>;
  incomeSourceForm: ReturnType<typeof useIncomeSourceForm>;
  onEditIncomeSource: (source: IncomeSource, item: IncomeSourceData) => void;
  onIgnoreIncome: (item: IncomeSourceData) => void;
  onRestoreIncome: (item: IncomeSourceData) => void;
  refreshData: () => void;
  onAddGoal: () => void;
  onConfirmGoal: (goal: { id: string; fromAccountId?: string | null; monthlyTarget: number }) => Promise<void>;
  confirmingGoalId: string | null;
  hasContributionModel: boolean;
  showSectionHeaders: boolean;
  year: number;
  month: number;
}

function BudgetSectionBlock({
  section,
  uiState,
  budgetId,
  accounts,
  allocationForm,
  categoryForm,
  incomeAllocationForm,
  incomeSourceForm,
  onEditIncomeSource,
  onIgnoreIncome,
  onRestoreIncome,
  refreshData,
  onAddGoal,
  onConfirmGoal,
  confirmingGoalId,
  hasContributionModel,
  showSectionHeaders,
  year,
  month,
}: BudgetSectionBlockProps) {
  // Skip rendering completely empty sections (no groups and no goals)
  if (section.groupsData.length === 0 && section.goals.length === 0 && !section.incomeData) {
    return null;
  }

  return (
    <div>
      {/* Section header */}
      {showSectionHeaders && (
        <div className="px-3 sm:px-4 py-2 bg-muted/60 border-b">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {section.title}
          </h3>
        </div>
      )}

      {/* Income (only for shared and personal sections, not partner) */}
      {section.incomeData && !section.isPartnerSection && (
        <IncomeSectionAccordion
          incomeData={section.incomeData}
          isExpanded={uiState.isIncomeExpanded}
          onToggle={uiState.toggleIncomeSection}
          expandedMembers={uiState.expandedIncomeMembers}
          onToggleMember={uiState.toggleIncomeMember}
          onEditIncome={(item: IncomeSourceData) => incomeAllocationForm.open(item)}
          onEditIncomeSource={(source: IncomeSource, item: IncomeSourceData) => onEditIncomeSource(source, item)}
          onIgnoreIncome={onIgnoreIncome}
          onRestoreIncome={onRestoreIncome}
          onDeleteIncomeSource={(source: IncomeSource) => incomeSourceForm.setDeletingSource(source)}
          onAddIncomeSource={(memberId?: string) => incomeSourceForm.openCreate(memberId)}
          mobileViewMode={uiState.mobileViewMode}
        />
      )}

      {/* Expenses */}
      {section.groupsData.length > 0 && (
        <ExpensesSectionAccordion
          groupsData={section.groupsData}
          totals={section.totals}
          budgetId={budgetId}
          accounts={accounts}
          isExpanded={uiState.isExpensesExpanded}
          onToggle={uiState.toggleExpensesSection}
          expandedGroups={uiState.expandedGroups}
          onToggleGroup={uiState.toggleGroup}
          onEditAllocation={(category, allocated) => allocationForm.open(category, allocated)}
          onEditCategory={(category) => categoryForm.openEdit(category)}
          onDeleteCategory={(category) => categoryForm.setDeletingCategory(category)}
          onAddCategory={(groupId, groupCode) => categoryForm.openCreate(groupId, groupCode)}
          onBillsChange={refreshData}
          mobileViewMode={uiState.mobileViewMode}
          year={year}
          month={month}
          onGroupAllocationChange={refreshData}
        />
      )}

      {/* Goals */}
      {(section.goals.length > 0 || (!section.isPartnerSection && hasContributionModel)) && (
        <GoalsSectionAccordion
          goals={section.goals}
          totalGoals={section.totalGoals}
          isExpanded={uiState.isGoalsExpanded}
          onToggle={uiState.toggleGoalsSection}
          onAddGoal={onAddGoal}
          onConfirmGoal={onConfirmGoal}
          confirmingGoalId={confirmingGoalId}
        />
      )}

      {/* Personal reserve summary within the "mine" section */}
      {section.key === 'mine' && hasContributionModel && section.effectiveTotalIncome > 0 && (
        <div className="px-3 sm:px-4 py-4 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>
              Sua reserva pessoal: <strong className="text-foreground">{formatCurrency(section.effectiveTotalIncome)}</strong> por mes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
