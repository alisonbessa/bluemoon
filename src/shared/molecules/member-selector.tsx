'use client';

import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

interface Member {
  id: string;
  name: string;
  color?: string | null;
}

interface MemberSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  members: Member[];
  /** Show label above the selector. Defaults to true */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Allow selecting "none" option. Defaults to true */
  allowNone?: boolean;
  /** Label for the "none" option */
  noneLabel?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default color for members without color */
  defaultColor?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * MemberSelector - Molecule for selecting a family/household member
 *
 * Displays members with their assigned color dot.
 * Used for:
 * - Assigning income sources to members
 * - Filtering by member
 * - Assigning responsibilities
 *
 * @example
 * ```tsx
 * <MemberSelector
 *   value={memberId}
 *   onChange={setMemberId}
 *   members={members}
 *   label="Quem Recebe"
 * />
 * ```
 */
export function MemberSelector({
  value,
  onChange,
  members,
  showLabel = true,
  label = 'Responsável',
  allowNone = true,
  noneLabel = 'Nenhum responsável específico',
  placeholder = 'Selecione...',
  defaultColor = '#6366f1',
  disabled = false,
  className,
}: MemberSelectorProps) {
  return (
    <div className={className}>
      {showLabel && (
        <div className="grid gap-2">
          <Label>{label}</Label>
        </div>
      )}
      <Select
        value={value || (allowNone ? 'none' : undefined)}
        onValueChange={(val) => onChange(val === 'none' ? undefined : val)}
        disabled={disabled}
      >
        <SelectTrigger className={showLabel ? 'mt-2' : ''}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: member.color || defaultColor }}
                />
                <span>{member.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
