'use client';

import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
} from '@/shared/ui/compact-table';
import { formatCentsToDisplay } from '@/shared/ui/currency-input';
import {
  INCOME_TYPE_CONFIG_PLURAL,
  FREQUENCY_LABELS,
  type IncomeType,
} from '@/types/income';
import type { IncomeSource } from '@/types';

const GRID_COLS = '24px 1fr 100px 80px 100px';

interface IncomeListProps {
  incomeSources: IncomeSource[];
  isExpanded: (type: string) => boolean;
  toggleGroup: (type: string) => void;
  onEdit: (source: IncomeSource) => void;
  onDelete: (source: IncomeSource) => void;
}

export function IncomeList({
  incomeSources,
  isExpanded,
  toggleGroup,
  onEdit,
  onDelete,
}: IncomeListProps) {
  // Group income sources by type
  const incomeByType: Record<IncomeType, IncomeSource[]> = {
    salary: incomeSources.filter((s) => s.type === 'salary'),
    benefit: incomeSources.filter((s) => s.type === 'benefit'),
    freelance: incomeSources.filter((s) => s.type === 'freelance'),
    rental: incomeSources.filter((s) => s.type === 'rental'),
    investment: incomeSources.filter((s) => s.type === 'investment'),
    other: incomeSources.filter((s) => s.type === 'other'),
  };

  const typesWithIncome = (
    Object.entries(incomeByType) as [IncomeType, IncomeSource[]][]
  ).filter(([, sources]) => sources.length > 0);

  if (incomeSources.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Table Header */}
      <div
        className={COMPACT_TABLE_STYLES.header}
        style={{ gridTemplateColumns: GRID_COLS }}
      >
        <div></div>
        <div>Fonte</div>
        <div>Quem Recebe</div>
        <div>Dia</div>
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
              gridCols={GRID_COLS}
              emptyColsCount={2}
              summary={`+${formatCentsToDisplay(typeTotal)}`}
              summaryClassName="text-green-600"
            />

            {/* Income Source Rows */}
            {expanded &&
              sources.map((source) => (
                <IncomeSourceRow
                  key={source.id}
                  source={source}
                  icon={config.icon}
                  onEdit={() => onEdit(source)}
                  onDelete={() => onDelete(source)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

interface IncomeSourceRowProps {
  source: IncomeSource;
  icon: string;
  onEdit: () => void;
  onDelete: () => void;
}

function IncomeSourceRow({
  source,
  icon,
  onEdit,
  onDelete,
}: IncomeSourceRowProps) {
  return (
    <div
      className={COMPACT_TABLE_STYLES.itemRow}
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <div className="flex items-center justify-center">
        <span className="text-base">{icon}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate font-medium">{source.name}</span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {FREQUENCY_LABELS[source.frequency]}
        </span>
        <HoverActions
          onEdit={onEdit}
          onDelete={onDelete}
          editTitle="Editar fonte de renda"
          deleteTitle="Excluir fonte de renda"
        />
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {source.member ? (
          <>
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: source.member.color || '#6366f1',
              }}
            />
            <span className="truncate text-xs">{source.member.name}</span>
          </>
        ) : (
          <span className="text-xs">-</span>
        )}
      </div>
      <div className="text-muted-foreground">
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
  );
}
