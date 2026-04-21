'use client';

import { ACCOUNT_TYPE_CONFIG, getAccountTypeIcon, type AccountType } from '@/features/accounts/types';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';

const ACCOUNT_TYPE_ORDER: AccountType[] = [
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
  'benefit',
];

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
  label = 'Forma de Pagamento',
  placeholder = 'Selecione...',
  hasError = false,
  allowNone = true,
  noneLabel = 'Nenhuma forma de pagamento específica',
  className,
}: AccountSelectorProps) {
  const handleChange = (val: string) => {
    onChange(val === 'none' ? undefined : val);
  };

  const accountsByType = new Map<string, Account[]>();
  for (const account of accounts) {
    const type = account.type || 'checking';
    const bucket = accountsByType.get(type);
    if (bucket) {
      bucket.push(account);
    } else {
      accountsByType.set(type, [account]);
    }
  }

  const orderedTypes = [
    ...ACCOUNT_TYPE_ORDER.filter((t) => accountsByType.has(t)),
    ...Array.from(accountsByType.keys()).filter(
      (t) => !ACCOUNT_TYPE_ORDER.includes(t as AccountType)
    ),
  ];

  return (
    <div className={cn('grid gap-2 min-w-0', className)}>
      {showLabel && <Label>{label}</Label>}
      <Select
        value={value || (allowNone ? 'none' : undefined)}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger className={cn('w-full overflow-hidden', hasError && 'border-destructive')}>
          <SelectValue placeholder={placeholder} className="truncate" />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
          {orderedTypes.map((type) => {
            const group = accountsByType.get(type)!.slice().sort((a, b) =>
              a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
            );
            const typeLabel =
              ACCOUNT_TYPE_CONFIG[type as AccountType]?.label ?? type;
            return (
              <SelectGroup key={type}>
                <SelectLabel>{typeLabel}</SelectLabel>
                {group.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <span className="shrink-0">{getAccountTypeIcon(account.type)}</span>
                      <span className="truncate">{account.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
