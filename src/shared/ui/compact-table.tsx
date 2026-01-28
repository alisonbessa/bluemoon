"use client";

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

// Styles constants for consistent padding across all tables
export const COMPACT_TABLE_STYLES = {
  header: "grid gap-2 border-b px-4 py-2 text-xs font-medium text-muted-foreground",
  groupHeader: "grid gap-2 px-2 py-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors border-b",
  itemRow: "group/row grid gap-2 pl-12 pr-4 py-2 text-sm hover:bg-muted/30 transition-colors border-b last:border-b-0",
} as const;

// Reusable group toggle row component
interface GroupToggleRowProps {
  isExpanded: boolean;
  onToggle: () => void;
  icon: ReactNode;
  label: string;
  count?: number;
  summary?: ReactNode;
  summaryClassName?: string;
  gridCols: string;
  emptyColsCount?: number; // Number of empty middle columns
  onAdd?: () => void; // Optional add button action
  addTitle?: string;
}

export function GroupToggleRow({
  isExpanded,
  onToggle,
  icon,
  label,
  count,
  summary,
  summaryClassName,
  gridCols,
  emptyColsCount = 2,
  onAdd,
  addTitle = "Adicionar",
}: GroupToggleRowProps) {
  return (
    <div className="group/header">
      <div
        className={COMPACT_TABLE_STYLES.groupHeader}
        style={{ gridTemplateColumns: gridCols }}
        onClick={onToggle}
      >
        <div className="flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-sm whitespace-nowrap">{label}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground">({count})</span>
          )}
          {onAdd && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="ml-1 p-1 rounded hover:bg-muted opacity-0 group-hover/header:opacity-100 transition-opacity"
              title={addTitle}
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        {/* Empty middle columns */}
        {Array.from({ length: emptyColsCount }).map((_, i) => (
          <div key={i}></div>
        ))}
        {/* Summary on the right */}
        {summary !== undefined && (
          <div className={cn("text-right text-sm font-semibold", summaryClassName)}>
            {summary}
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable hover action buttons
interface HoverActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editTitle?: string;
  deleteTitle?: string;
}

export function HoverActions({
  onEdit,
  onDelete,
  editTitle = "Editar",
  deleteTitle = "Excluir",
}: HoverActionsProps) {
  if (!onEdit && !onDelete) return null;

  return (
    <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 rounded hover:bg-muted"
          title={editTitle}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded hover:bg-destructive/10"
          title={deleteTitle}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      )}
    </div>
  );
}

// Hook to manage expanded state
interface UseExpandedGroupsOptions {
  /** If true, only one group can be expanded at a time (accordion behavior) */
  accordion?: boolean;
}

export function useExpandedGroups(
  initialGroups: string[] = [],
  options: UseExpandedGroupsOptions = {}
) {
  const { accordion = false } = options;
  const [expandedGroups, setExpandedGroups] = useState<string[]>(initialGroups);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      if (prev.includes(groupId)) {
        // Close if already open
        return accordion ? [] : prev.filter((id) => id !== groupId);
      }
      // Open - in accordion mode, only this one; otherwise add to list
      return accordion ? [groupId] : [...prev, groupId];
    });
  };

  const isExpanded = (groupId: string) => expandedGroups.includes(groupId);

  return { expandedGroups, toggleGroup, isExpanded, setExpandedGroups };
}
