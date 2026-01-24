'use client';

import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatCurrency, INCOME_TYPE_CONFIG, FREQUENCY_LABELS } from '../types';

// Local types that match what the budget page provides
// These are more permissive to allow compatibility with the page's local types
interface MemberLocal {
  id: string;
  name: string;
  color: string | null;
}

interface IncomeSourceLocal {
  id: string;
  name: string;
  type: 'salary' | 'benefit' | 'freelance' | 'rental' | 'investment' | 'other';
  amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly';
  dayOfMonth?: number | null;
  memberId: string | null;
  member?: { id: string; name: string; color?: string | null } | null;
  account?: { id: string; name: string; icon?: string | null } | null;
  isAutoConfirm?: boolean;
}

interface IncomeSourceDataLocal {
  incomeSource: IncomeSourceLocal;
  planned: number;
  defaultAmount: number;
  received: number;
}

interface IncomeMemberGroupLocal {
  member: MemberLocal | null;
  sources: IncomeSourceDataLocal[];
  totals: { planned: number; received: number };
}

interface IncomeDataLocal {
  byMember: IncomeMemberGroupLocal[];
  totals: { planned: number; received: number };
}

interface IncomeSectionAccordionProps {
  incomeData: IncomeDataLocal;
  isExpanded: boolean;
  onToggle: () => void;
  expandedMembers: string[];
  onToggleMember: (memberId: string) => void;
  onEditIncome: (item: IncomeSourceDataLocal) => void;
  onEditIncomeSource: (source: IncomeSourceLocal) => void;
  onDeleteIncomeSource: (source: IncomeSourceLocal) => void;
  onAddIncomeSource: (preselectedMemberId?: string) => void;
}

export function IncomeSectionAccordion({
  incomeData,
  isExpanded,
  onToggle,
  expandedMembers,
  onToggleMember,
  onEditIncome,
  onEditIncomeSource,
  onDeleteIncomeSource,
  onAddIncomeSource,
}: IncomeSectionAccordionProps) {
  if (!incomeData || incomeData.byMember.length === 0) {
    return null;
  }

  return (
    <div className="border-b-4 border-green-200 dark:border-green-900">
      {/* Income Section Header - Clickable Toggle */}
      <div
        className="group px-4 py-2 bg-green-100 dark:bg-green-950/50 border-b flex items-center justify-between cursor-pointer hover:bg-green-200/50 dark:hover:bg-green-950/70 transition-colors"
        onClick={onToggle}
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
            Realizado:
          </span>
          <span className="text-green-600 dark:text-green-400">
            {formatCurrency(incomeData.totals.received)}
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            Disponivel:
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
        <div className="overflow-x-auto">
          <div className="min-w-[550px]">
            {/* Income Table Header */}
            <div className="grid grid-cols-[24px_1fr_100px_100px_100px] px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-green-50/50 dark:bg-green-950/20">
              <div />
              <div>Fonte</div>
              <div className="text-right">Planejado</div>
              <div className="text-right">Realizado</div>
              <div className="text-right">Disponivel</div>
            </div>

            {/* If only one member (or no member), show sources directly */}
            {incomeData.byMember.length === 1 ? (
              incomeData.byMember[0].sources.map((item) => (
                <IncomeSourceRow
                  key={item.incomeSource.id}
                  item={item}
                  indent={false}
                  onEditIncome={() => onEditIncome(item)}
                  onEditSource={() => onEditIncomeSource(item.incomeSource)}
                  onDeleteSource={() => onDeleteIncomeSource(item.incomeSource)}
                />
              ))
            ) : (
              /* Multiple members - show with collapsible sections */
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
                  onEditSource={onEditIncomeSource}
                  onDeleteSource={onDeleteIncomeSource}
                  onAddSource={() => onAddIncomeSource(memberGroup.member?.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface IncomeMemberSectionProps {
  memberGroup: IncomeMemberGroupLocal;
  isExpanded: boolean;
  onToggle: () => void;
  onEditIncome: (item: IncomeSourceDataLocal) => void;
  onEditSource: (source: IncomeSourceLocal) => void;
  onDeleteSource: (source: IncomeSourceLocal) => void;
  onAddSource: () => void;
}

function IncomeMemberSection({
  memberGroup,
  isExpanded,
  onToggle,
  onEditIncome,
  onEditSource,
  onDeleteSource,
  onAddSource,
}: IncomeMemberSectionProps) {
  const memberAvailable =
    memberGroup.totals.planned - memberGroup.totals.received;

  return (
    <div>
      {/* Member Row */}
      <div
        className="group grid grid-cols-[24px_1fr_100px_100px_100px] px-4 py-1.5 items-center bg-green-50/50 dark:bg-green-950/20 border-b cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/40 text-sm"
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
            {memberGroup.member?.name || 'Sem responsavel'}
          </span>
          <span className="text-xs text-muted-foreground">
            ({memberGroup.sources.length})
          </span>
          <button
            className="ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onAddSource();
            }}
            title={`Adicionar fonte de renda para ${memberGroup.member?.name || 'sem responsavel'}`}
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

      {/* Income Sources for this member */}
      {isExpanded &&
        memberGroup.sources.map((item) => (
          <IncomeSourceRow
            key={item.incomeSource.id}
            item={item}
            indent={true}
            onEditIncome={() => onEditIncome(item)}
            onEditSource={() => onEditSource(item.incomeSource)}
            onDeleteSource={() => onDeleteSource(item.incomeSource)}
          />
        ))}
    </div>
  );
}

interface IncomeSourceRowProps {
  item: IncomeSourceDataLocal;
  indent: boolean;
  onEditIncome: () => void;
  onEditSource: () => void;
  onDeleteSource: () => void;
}

function IncomeSourceRow({
  item,
  indent,
  onEditIncome,
  onEditSource,
  onDeleteSource,
}: IncomeSourceRowProps) {
  const isEdited = item.planned !== item.defaultAmount;
  const available = item.planned - item.received;

  return (
    <div
      className="group/row grid grid-cols-[24px_1fr_100px_100px_100px] px-4 py-1.5 items-center border-b hover:bg-green-50/50 dark:hover:bg-green-950/20 text-sm cursor-pointer"
      onClick={onEditIncome}
    >
      <div />
      <div className={cn('flex items-center gap-1.5', indent ? 'pl-10' : 'pl-5')}>
        <span>
          {INCOME_TYPE_CONFIG[item.incomeSource.type]?.icon || '💵'}
        </span>
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
              onEditSource();
            }}
            className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
            title="Editar fonte de renda"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSource();
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
}
