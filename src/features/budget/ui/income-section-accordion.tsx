'use client';

import { ChevronDown, Plus, Pencil, Trash2, MoreVertical, DollarSign } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import { AccordionContent } from '@/shared/ui/accordion-content';
import { formatCurrency, INCOME_TYPE_CONFIG, FREQUENCY_LABELS } from '../types';
import type { MobileViewMode } from '../hooks';

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
  mobileViewMode?: MobileViewMode;
}

// Helper to get the value based on view mode for income
function getIncomeDisplayValue(
  planned: number,
  received: number,
  mode: MobileViewMode
): { value: number; colorClass: string } {
  switch (mode) {
    case 'planned':
      return { value: planned, colorClass: 'text-green-800 dark:text-green-200' };
    case 'actual':
      return { value: received, colorClass: 'text-green-600 dark:text-green-400' };
    case 'available':
    default:
      const available = planned - received;
      return {
        value: Math.abs(available),
        colorClass: received < planned ? 'text-red-600' : 'text-green-600',
      };
  }
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
  mobileViewMode = 'available',
}: IncomeSectionAccordionProps) {
  if (!incomeData || incomeData.byMember.length === 0) {
    return null;
  }

  return (
    <div className="border-b-4 border-green-200 dark:border-green-900">
      {/* Income Section Header - Clickable Toggle */}
      <div
        className="group grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-2 bg-green-100 dark:bg-green-950/50 border-b items-center cursor-pointer hover:bg-green-200/50 dark:hover:bg-green-950/70 transition-colors"
        onClick={onToggle}
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 text-green-700 dark:text-green-300 transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <span className="font-bold text-sm text-green-800 dark:text-green-200">
            RECEITAS
          </span>
          <button
            className="hidden sm:block ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAddIncomeSource();
            }}
            title="Adicionar fonte de renda"
          >
            <Plus className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
          </button>
        </div>
        <div className="hidden sm:block text-sm font-bold tabular-nums text-green-800 dark:text-green-200">
          {formatCurrency(incomeData.totals.planned)}
        </div>
        <div className="hidden sm:block text-sm font-bold tabular-nums text-green-600 dark:text-green-400">
          {formatCurrency(incomeData.totals.received)}
        </div>
        {/* Desktop: always show available */}
        <div
          className={cn(
            'hidden sm:block text-sm font-bold tabular-nums',
            incomeData.totals.received < incomeData.totals.planned
              ? 'text-red-600'
              : 'text-green-600'
          )}
        >
          {formatCurrency(
            Math.abs(incomeData.totals.planned - incomeData.totals.received)
          )}
        </div>
        {/* Mobile: show based on view mode */}
        {(() => {
          const display = getIncomeDisplayValue(
            incomeData.totals.planned,
            incomeData.totals.received,
            mobileViewMode
          );
          return (
            <div className={cn('sm:hidden text-xs font-bold tabular-nums pr-2 whitespace-nowrap', display.colorClass)}>
              {formatCurrency(display.value)}
            </div>
          );
        })()}
        {/* Mobile: add button in separate column */}
        <div className="sm:hidden flex items-center justify-center">
          <button
            className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
            onClick={(e) => {
              e.stopPropagation();
              onAddIncomeSource();
            }}
          >
            <Plus className="h-4 w-4 text-green-700 dark:text-green-300" />
          </button>
        </div>
      </div>

      <AccordionContent isOpen={isExpanded}>
        <div>
          {/* Income Table Header */}
          <div className="grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 text-[11px] font-medium text-muted-foreground uppercase border-b bg-green-50/50 dark:bg-green-950/20">
            <div />
            <div>Fonte</div>
            <div className="hidden sm:block">Planejado</div>
            <div className="hidden sm:block">Realizado</div>
            {/* Desktop: always show Disp. */}
            <div className="hidden sm:block">Disp.</div>
            {/* Mobile: show based on view mode */}
            <div className="sm:hidden">
              {mobileViewMode === 'planned' ? 'Plan.' : mobileViewMode === 'actual' ? 'Real.' : 'Disp.'}
            </div>
            <div className="sm:hidden" />
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
                mobileViewMode={mobileViewMode}
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
                mobileViewMode={mobileViewMode}
              />
            ))
          )}
        </div>
      </AccordionContent>
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
  mobileViewMode?: MobileViewMode;
}

function IncomeMemberSection({
  memberGroup,
  isExpanded,
  onToggle,
  onEditIncome,
  onEditSource,
  onDeleteSource,
  onAddSource,
  mobileViewMode = 'available',
}: IncomeMemberSectionProps) {
  const memberAvailable =
    memberGroup.totals.planned - memberGroup.totals.received;

  return (
    <div>
      {/* Member Row */}
      <div
        className="group grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 items-center bg-green-50/50 dark:bg-green-950/20 border-b cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/40 text-sm"
        onClick={onToggle}
      >
        <div />
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
              !isExpanded && '-rotate-90'
            )}
          />
          {memberGroup.member && (
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{
                backgroundColor: memberGroup.member.color || '#6366f1',
              }}
            />
          )}
          <span className="font-semibold truncate">
            {memberGroup.member?.name || 'Sem responsavel'}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            ({memberGroup.sources.length})
          </span>
          {/* Desktop: hover to show add button */}
          <button
            className="hidden sm:block ml-1 p-0.5 rounded hover:bg-green-200 dark:hover:bg-green-800 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onAddSource();
            }}
            title={`Adicionar fonte de renda para ${memberGroup.member?.name || 'sem responsavel'}`}
          >
            <Plus className="h-3.5 w-3.5 text-green-700 dark:text-green-300" />
          </button>
        </div>
        <div className="hidden sm:block text-xs tabular-nums font-bold">
          {formatCurrency(memberGroup.totals.planned)}
        </div>
        <div className="hidden sm:block text-xs tabular-nums font-bold text-green-600 dark:text-green-400">
          {formatCurrency(memberGroup.totals.received)}
        </div>
        {/* Desktop: always show available */}
        <div
          className={cn(
            'hidden sm:block text-xs tabular-nums font-bold',
            memberGroup.totals.received < memberGroup.totals.planned
              ? 'text-red-600'
              : 'text-green-600'
          )}
        >
          {formatCurrency(Math.abs(memberAvailable))}
        </div>
        {/* Mobile: show based on view mode */}
        {(() => {
          const display = getIncomeDisplayValue(
            memberGroup.totals.planned,
            memberGroup.totals.received,
            mobileViewMode
          );
          return (
            <div className={cn('sm:hidden text-xs tabular-nums pr-2 font-bold', display.colorClass)}>
              {formatCurrency(display.value)}
            </div>
          );
        })()}
        {/* Mobile: menu in separate column */}
        <div className="sm:hidden flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-green-700 dark:text-green-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddSource}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar fonte de renda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Income Sources for this member */}
      <AccordionContent isOpen={isExpanded}>
        {memberGroup.sources.map((item) => (
          <IncomeSourceRow
            key={item.incomeSource.id}
            item={item}
            indent={true}
            onEditIncome={() => onEditIncome(item)}
            onEditSource={() => onEditSource(item.incomeSource)}
            onDeleteSource={() => onDeleteSource(item.incomeSource)}
            mobileViewMode={mobileViewMode}
          />
        ))}
      </AccordionContent>
    </div>
  );
}

interface IncomeSourceRowProps {
  item: IncomeSourceDataLocal;
  indent: boolean;
  onEditIncome: () => void;
  onEditSource: () => void;
  onDeleteSource: () => void;
  mobileViewMode?: MobileViewMode;
}

function IncomeSourceRow({
  item,
  indent,
  onEditIncome,
  onEditSource,
  onDeleteSource,
  mobileViewMode = 'available',
}: IncomeSourceRowProps) {
  const isEdited = item.planned !== item.defaultAmount;
  const available = item.planned - item.received;

  return (
    <div
      className="group/row grid grid-cols-[16px_1fr_80px_24px] sm:grid-cols-[24px_1fr_100px_100px_100px] px-3 sm:px-4 py-1.5 items-center border-b hover:bg-green-50/50 dark:hover:bg-green-950/20 text-sm cursor-pointer"
      onClick={onEditIncome}
    >
      <div />
      <div className={cn('flex items-center gap-1 sm:gap-1.5 min-w-0', indent ? 'pl-4 sm:pl-6' : 'pl-1 sm:pl-3')}>
        <span className="shrink-0">
          {INCOME_TYPE_CONFIG[item.incomeSource.type]?.icon || '💵'}
        </span>
        <span className="truncate">{item.incomeSource.name}</span>
        <span className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1 rounded shrink-0">
          {FREQUENCY_LABELS[item.incomeSource.frequency] || 'Mensal'}
        </span>
        {isEdited && (
          <span className="hidden sm:inline text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1 rounded shrink-0">
            editado
          </span>
        )}
        {/* Desktop: hover to show action buttons */}
        <div className="hidden sm:flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
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
      <div className="hidden sm:block text-xs tabular-nums">
        {formatCurrency(item.planned)}
      </div>
      <div className="hidden sm:block text-xs tabular-nums text-green-600 dark:text-green-400">
        {formatCurrency(item.received)}
      </div>
      {/* Desktop: always show available */}
      <div
        className={cn(
          'hidden sm:block text-xs tabular-nums',
          item.received < item.planned ? 'text-red-600' : 'text-green-600'
        )}
      >
        {formatCurrency(Math.abs(available))}
      </div>
      {/* Mobile: show based on view mode */}
      {(() => {
        const display = getIncomeDisplayValue(item.planned, item.received, mobileViewMode);
        return (
          <div className={cn('sm:hidden text-xs tabular-nums pr-2', display.colorClass)}>
            {formatCurrency(display.value)}
          </div>
        );
      })()}
      {/* Mobile: menu in separate column */}
      <div className="sm:hidden flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditIncome}>
              <DollarSign className="h-4 w-4 mr-2" />
              Editar valor planejado
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEditSource}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar fonte de renda
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDeleteSource}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir fonte de renda
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
