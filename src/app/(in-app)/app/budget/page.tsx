'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/shared/ui/button';
import { Loader2, PiggyBank } from 'lucide-react';
import { GoalFormModal } from '@/features/goals';
import { useTutorial } from '@/shared/tutorial/tutorial-provider';

import {
  useBudgetPeriod,
  useBudgetUIState,
  useBudgetPageData,
  useAllocationForm,
  useCategoryForm,
  useIncomeAllocationForm,
  useIncomeSourceForm,
  useBudgetActions,
} from '@/features/budget/hooks';

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
  CopyAllocationsModal,
  CopyHintModal,
} from '@/features/budget/ui';

import type {
  GroupData,
  IncomeMemberGroup,
  IncomeSource,
  IncomeSourceData,
} from '@/features/budget/types';

export default function BudgetPage() {
  const router = useRouter();
  const { notifyActionCompleted, isActive: isTutorialActive } = useTutorial();

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
  const {
    budgets,
    primaryBudgetId: budgetId,
    members,
    accounts,
    groupsData,
    totals,
    incomeData,
    totalIncome,
    hasPreviousMonthData,
    goals,
    isLoading,
    refreshData,
  } = useBudgetPageData(currentYear, currentMonth);

  // Local UI state
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [showCopyHintModal, setShowCopyHintModal] = useState(false);
  const hasInitializedUI = useRef(false);

  // Initialize expanded groups/members when data loads
  useEffect(() => {
    if (isLoading || hasInitializedUI.current) return;

    if (groupsData.length > 0) {
      uiState.setExpandedGroups(groupsData.map((g: GroupData) => g.group.id));
    }

    if (incomeData?.byMember) {
      const memberIds = incomeData.byMember
        .map((m: IncomeMemberGroup) => m.member?.id || 'no-member')
        .filter(Boolean);
      uiState.setExpandedIncomeMembers(memberIds);
    }

    hasInitializedUI.current = true;
  }, [isLoading, groupsData, incomeData, uiState]);

  // Reset initialization flag when period changes
  useEffect(() => {
    hasInitializedUI.current = false;
  }, [currentYear, currentMonth]);

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

  // Handle group selection - converts groupId to categoryIds
  const handleToggleGroupSelection = (groupId: string) => {
    const group = groupsData.find((g) => g.group.id === groupId);
    if (group) {
      const categoryIds = group.categories.map((c) => c.category.id);
      uiState.toggleGroupSelection(categoryIds);
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
        <h2 className="text-xl font-semibold">Nenhum orçamento encontrado</h2>
        <p className="text-muted-foreground">Complete o onboarding para começar</p>
        <Button onClick={() => router.push('/app')}>Ir para o Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-background">
        <BudgetHeader
          year={currentYear}
          month={currentMonth}
          onMonthChange={handleMonthChange}
          totalIncome={totalIncome}
          totalAllocated={totals.allocated}
        />

        <BudgetFilters
          activeFilter={uiState.activeFilter}
          onFilterChange={uiState.setActiveFilter}
          hasPreviousMonthData={hasPreviousMonthData}
          previousMonthName={budgetActions.previousMonthName}
          hasExistingAllocations={totals.allocated > 0}
          onCopyClick={handleCopyClick}
          isCopying={budgetActions.isCopying}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Income Section */}
        {incomeData && (
          <IncomeSectionAccordion
            incomeData={incomeData}
            isExpanded={uiState.isIncomeExpanded}
            onToggle={uiState.toggleIncomeSection}
            expandedMembers={uiState.expandedIncomeMembers}
            onToggleMember={uiState.toggleIncomeMember}
            onEditIncome={(item: IncomeSourceData) => incomeAllocationForm.open(item)}
            onEditIncomeSource={(source: IncomeSource) => incomeSourceForm.openEdit(source)}
            onDeleteIncomeSource={(source: IncomeSource) => incomeSourceForm.setDeletingSource(source)}
            onAddIncomeSource={(memberId?: string) => incomeSourceForm.openCreate(memberId)}
          />
        )}

        {/* Expenses Section */}
        {groupsData.length > 0 ? (
          <ExpensesSectionAccordion
            groupsData={groupsData}
            totals={totals}
            budgetId={budgetId || ''}
            accounts={accounts}
            isExpanded={uiState.isExpensesExpanded}
            onToggle={uiState.toggleExpensesSection}
            expandedGroups={uiState.expandedGroups}
            onToggleGroup={uiState.toggleGroup}
            activeFilter={uiState.activeFilter}
            selectedCategories={uiState.selectedCategories}
            onToggleCategorySelection={uiState.toggleCategorySelection}
            onToggleGroupSelection={handleToggleGroupSelection}
            onEditAllocation={(category, allocated) => allocationForm.open(category, allocated)}
            onEditCategory={(category) => categoryForm.openEdit(category)}
            onDeleteCategory={(category) => categoryForm.setDeletingCategory(category)}
            onAddCategory={(groupId, groupCode) => categoryForm.openCreate(groupId, groupCode)}
            onBillsChange={refreshData}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PiggyBank className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Nenhuma categoria configurada</h3>
            <Button onClick={() => router.push('/app/categories/setup')}>
              Configurar Categorias
            </Button>
          </div>
        )}

        {/* Goals Section */}
        <GoalsSectionAccordion
          goals={goals}
          isExpanded={uiState.isGoalsExpanded}
          onToggle={uiState.toggleGoalsSection}
          onAddGoal={() => setIsGoalFormOpen(true)}
        />
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
        formData={incomeSourceForm.formData}
        errors={incomeSourceForm.errors}
        members={members}
        filteredAccounts={incomeSourceForm.filteredAccounts}
        onFieldChange={incomeSourceForm.setFormField}
      />

      {/* Income Source Delete Dialog */}
      <IncomeSourceDeleteDialog
        source={incomeSourceForm.deletingSource}
        onClose={() => incomeSourceForm.setDeletingSource(null)}
        onConfirm={incomeSourceForm.confirmDelete}
        isDeleting={incomeSourceForm.isDeleting}
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
        onSuccess={refreshData}
      />
    </div>
  );
}
