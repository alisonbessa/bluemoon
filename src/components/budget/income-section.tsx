'use client';

import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/formatters';
import { cn } from '@/shared/lib/utils';
import type { IncomeData, IncomeSourceData, IncomeSource, IncomeMemberGroup } from '@/types/income';
import { INCOME_TYPE_CONFIG, FREQUENCY_LABELS } from '@/types/income';

interface IncomeSectionProps {
  incomeData: IncomeData;
  isExpanded: boolean;
  expandedMembers: string[];
  onToggleExpanded: () => void;
  onToggleMember: (memberId: string) => void;
  onEditIncome: (item: IncomeSourceData) => void;
  onAddIncomeSource: (memberId?: string) => void;
  onEditIncomeSource: (source: IncomeSource) => void;
  onDeleteIncomeSource: (source: IncomeSource) => void;
}

export function IncomeSection({
  incomeData,
  isExpanded,
  expandedMembers,
  onToggleExpanded,
  onToggleMember,
  onEditIncome,
  onAddIncomeSource,
  onEditIncomeSource,
  onDeleteIncomeSource,
}: IncomeSectionProps) {
  if (!incomeData || incomeData.byMember.length === 0) {
    return null;
  }

  return (
    <div className="border-b-4 border-green-200 dark:border-green-900">
      {/* Income Section Header */}
      <div
        className="group px-4 py-2 bg-green-100 dark:bg-green-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-green-200/50 dark:hover:bg-green-950/70 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'h-4 w-4 text-green-700 dark:text-green-300 transition-transform',
              !isExpanded && '-rotate-90'
            )}
          />
          <span className="text-lg">💰</span>
          <span className="font-bold text-sm text-green-800 dark:text-green-200">
            RECEITAS
          </span>
          <button
            className="ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAddIncomeSource();
            }}
            title="Adicionar fonte de renda"
          >
            <Plus className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm font-bold text-green-800 dark:text-green-200">
          <span className="text-xs text-muted-foreground font-normal">
            Planejado:
          </span>
          <span>{formatCurrency(incomeData.totals.planned)}</span>
          <span className="text-xs text-muted-foreground font-normal">
            Recebido:
          </span>
          <span className="text-green-600 dark:text-green-400">
            {formatCurrency(incomeData.totals.received)}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {incomeData.totals.received < incomeData.totals.planned
              ? 'A Receber:'
              : 'Extra:'}
          </span>
          <span
            className={
              incomeData.totals.received < incomeData.totals.planned
                ? 'text-red-600'
                : 'text-green-600'
            }
          >
            {formatCurrency(
              Math.abs(incomeData.totals.planned - incomeData.totals.received)
            )}
          </span>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Income Table Header */}
          <div className="grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-green-50/50 dark:bg-green-950/20">
            <div />
            <div>Fonte</div>
            <div className="text-right">Planejado</div>
            <div className="text-right">Recebido</div>
            <div className="text-right">A Receber</div>
          </div>

          {/* Single member or multiple members */}
          {incomeData.byMember.length === 1 ? (
            <IncomeSourceRows
              sources={incomeData.byMember[0].sources}
              onEditIncome={onEditIncome}
              onEditIncomeSource={onEditIncomeSource}
              onDeleteIncomeSource={onDeleteIncomeSource}
            />
          ) : (
            incomeData.byMember.map((memberGroup) => (
              <IncomeMemberSection
                key={memberGroup.member?.id || 'no-member'}
                memberGroup={memberGroup}
                isExpanded={expandedMembers.includes(
                  memberGroup.member?.id || 'no-member'
                )}
                onToggle={() =>
                  onToggleMember(memberGroup.member?.id || 'no-member')
                }
                onEditIncome={onEditIncome}
                onAddIncomeSource={onAddIncomeSource}
                onEditIncomeSource={onEditIncomeSource}
                onDeleteIncomeSource={onDeleteIncomeSource}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}

interface IncomeSourceRowsProps {
  sources: IncomeSourceData[];
  indented?: boolean;
  onEditIncome: (item: IncomeSourceData) => void;
  onEditIncomeSource: (source: IncomeSource) => void;
  onDeleteIncomeSource: (source: IncomeSource) => void;
}

function IncomeSourceRows({
  sources,
  indented = false,
  onEditIncome,
  onEditIncomeSource,
  onDeleteIncomeSource,
}: IncomeSourceRowsProps) {
  return (
    <>
      {sources.map((item) => {
        const isEdited = item.planned !== item.defaultAmount;
        const available = item.planned - item.received;
        const typeConfig = INCOME_TYPE_CONFIG[item.incomeSource.type];

        return (
          <div
            key={item.incomeSource.id}
            className="group/row grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center border-b hover:bg-green-50/50 dark:hover:bg-green-950/20 text-sm cursor-pointer"
            onClick={() => onEditIncome(item)}
          >
            <div />
            <div className={cn('flex items-center gap-1.5', indented ? 'pl-10' : 'pl-5')}>
              <span>{typeConfig?.icon || '💵'}</span>
              <span>{item.incomeSource.name}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded">
                {FREQUENCY_LABELS[item.incomeSource.frequency] || 'Mensal'}
              </span>
              {isEdited && (
                <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded">
                  editado
                </span>
              )}
              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditIncomeSource(item.incomeSource);
                  }}
                  className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                  title="Editar fonte de renda"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteIncomeSource(item.incomeSource);
                  }}
                  className="p-1 rounded hover:bg-destructive/10"
                  title="Excluir fonte de renda"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            </div>
            <div className="text-right text-xs tabular-nums">
              {formatCurrency(item.planned)}
            </div>
            <div className="text-right text-xs tabular-nums text-green-600 dark:text-green-400">
              {formatCurrency(item.received)}
            </div>
            <div
              className={cn(
                'text-right text-xs tabular-nums',
                item.received < item.planned ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatCurrency(Math.abs(available))}
            </div>
          </div>
        );
      })}
    </>
  );
}

interface IncomeMemberSectionProps {
  memberGroup: IncomeMemberGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onEditIncome: (item: IncomeSourceData) => void;
  onAddIncomeSource: (memberId?: string) => void;
  onEditIncomeSource: (source: IncomeSource) => void;
  onDeleteIncomeSource: (source: IncomeSource) => void;
}

function IncomeMemberSection({
  memberGroup,
  isExpanded,
  onToggle,
  onEditIncome,
  onAddIncomeSource,
  onEditIncomeSource,
  onDeleteIncomeSource,
}: IncomeMemberSectionProps) {
  const memberAvailable =
    memberGroup.totals.planned - memberGroup.totals.received;

  return (
    <div>
      {/* Member Row */}
      <div
        className="group grid grid-cols-[24px_1fr_100px_100px_110px] px-4 py-1.5 items-center bg-green-50/50 dark:bg-green-950/20 border-b cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/40 text-sm"
        onClick={onToggle}
      >
        <div />
        <div className="flex items-center gap-1.5">
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              !isExpanded && '-rotate-90'
            )}
          />
          {memberGroup.member && (
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: memberGroup.member.color || '#6366f1',
              }}
            />
          )}
          <span className="font-semibold">
            {memberGroup.member?.name || 'Sem responsável'}
          </span>
          <span className="text-xs text-muted-foreground">
            ({memberGroup.sources.length})
          </span>
          <button
            className="ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAddIncomeSource(memberGroup.member?.id);
            }}
            title={`Adicionar fonte de renda para ${memberGroup.member?.name || 'sem responsável'}`}
          >
            <Plus className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
          </button>
        </div>
        <div className="text-right text-xs tabular-nums font-bold">
          {formatCurrency(memberGroup.totals.planned)}
        </div>
        <div className="text-right text-xs tabular-nums font-bold text-green-600 dark:text-green-400">
          {formatCurrency(memberGroup.totals.received)}
        </div>
        <div
          className={cn(
            'text-right text-xs tabular-nums font-bold',
            memberGroup.totals.received < memberGroup.totals.planned
              ? 'text-red-600'
              : 'text-green-600'
          )}
        >
          {formatCurrency(Math.abs(memberAvailable))}
        </div>
      </div>

      {/* Income Sources */}
      {isExpanded && (
        <IncomeSourceRows
          sources={memberGroup.sources}
          indented
          onEditIncome={onEditIncome}
          onEditIncomeSource={onEditIncomeSource}
          onDeleteIncomeSource={onDeleteIncomeSource}
        />
      )}
    </div>
  );
}
