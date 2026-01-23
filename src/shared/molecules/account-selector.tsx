'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

interface Account {
  id: string;
  name: string;
  type?: string;
  icon?: string | null;
}

interface AccountSelectorProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  accounts: Account[];
  disabled?: boolean;
  /** Show label above the selector. Defaults to true */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show error state */
  hasError?: boolean;
  /** Allow selecting "none" option */
  allowNone?: boolean;
  /** Label for the none option */
  noneLabel?: string;
  className?: string;
}

/**
 * AccountSelector - Molecule for selecting a bank account
 *
 * Used for:
 * - Transaction account selection
 * - Income source destination account
 * - Goal contribution source account
 * - Transfer between accounts
 *
 * @example
 * ```tsx
 * <AccountSelector
 *   value={accountId}
 *   onChange={setAccountId}
 *   accounts={accounts}
 *   label="Conta de Destino"
 * />
 * ```
 */
export function AccountSelector({
  value,
  onChange,
  accounts,
  disabled = false,
  showLabel = true,
  label = 'Conta',
  placeholder = 'Selecione...',
  hasError = false,
  allowNone = true,
  noneLabel = 'Nenhuma conta específica',
  className,
}: AccountSelectorProps) {
  const handleChange = (val: string) => {
    onChange(val === 'none' ? undefined : val);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      {showLabel && <Label>{label}</Label>}
      <Select
        value={value || (allowNone ? 'none' : undefined)}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn('w-full', hasError && 'border-destructive')}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <span className="flex items-center gap-2">
                <span>{account.icon || '🏦'}</span>
                <span>{account.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
