'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  COMPACT_TABLE_STYLES,
  GroupToggleRow,
  HoverActions,
} from '@/shared/ui/compact-table';
import type { Category, CategoryGroup } from '../types';

const GRID_COLS = '24px 1fr 120px';

interface CategoryListProps {
  groups: CategoryGroup[];
  isExpanded: (id: string) => boolean;
  toggleGroup: (id: string) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onCreateNew: (groupId?: string) => void;
}

export function CategoryList({
  groups,
  isExpanded,
  toggleGroup,
  onEdit,
  onDelete,
  onCreateNew,
}: CategoryListProps) {
  if (groups.length === 0) {
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
        <div>Categoria</div>
        <div>Comportamento</div>
      </div>

      {/* Grouped by Group */}
      {groups.map((group) => {
        const expanded = isExpanded(group.id);

        return (
          <div key={group.id}>
            <GroupToggleRow
              isExpanded={expanded}
              onToggle={() => toggleGroup(group.id)}
              icon={group.icon || '📁'}
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
                    onCreateNew(group.id);
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
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={() => onEdit(category)}
                      onDelete={() => onDelete(category)}
                    />
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
                    onClick={() => onCreateNew(group.id)}
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
  );
}

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  return (
    <div
      className={COMPACT_TABLE_STYLES.itemRow}
      style={{ gridTemplateColumns: GRID_COLS }}
    >
      <div className="flex items-center justify-center">
        <span className="text-base">{category.icon || '📌'}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="truncate font-medium">{category.name}</span>
        <HoverActions
          onEdit={onEdit}
          onDelete={onDelete}
          editTitle="Editar categoria"
          deleteTitle="Excluir categoria"
        />
      </div>
      <div className="text-right text-xs text-muted-foreground">
        {category.behavior === 'set_aside' ? (
          <span className="bg-muted px-1.5 py-0.5 rounded">Acumula</span>
        ) : (
          <span>Recorrente</span>
        )}
      </div>
    </div>
  );
}
