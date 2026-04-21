"use client";

import { useState, useEffect } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FormModalWrapper } from "@/shared/molecules";
import { DayPicker } from "@/shared/ui/day-picker";
import { Switch } from "@/shared/ui/switch";
import { formatAmount, formatCurrencyFromDigits, parseCurrency } from "@/shared/lib/formatters";
import { useViewMode } from "@/shared/providers/view-mode-provider";
import type { AccountType, AccountFormData, AccountOwner } from "../types";
import { getAccountTypeIcon } from "../types";

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  initialData?: Partial<AccountFormData>;
  mode?: "create" | "edit";
  members?: AccountOwner[];
  /**
   * Show owner selector with "Compartilhado" option.
   * Defaults to true if members.length > 1.
   * Set explicitly to true for Duo plans even before partner joins.
   */
  allowSharedOwnership?: boolean;
  /** Current user's member ID - used to filter owner options to self only */
  currentUserMemberId?: string;
  /** Non-credit-card accounts available for payment account selection */
  availableAccounts?: { id: string; name: string; type: string; icon?: string | null }[];
}

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "checking", label: "Conta Corrente", icon: "🏦" },
  { value: "savings", label: "Poupança", icon: "🐷" },
  { value: "credit_card", label: "Cartão de Crédito", icon: "💳" },
  { value: "cash", label: "Dinheiro", icon: "💵" },
  { value: "investment", label: "Investimento", icon: "📈" },
  { value: "benefit", label: "Benefício", icon: "🍽️" },
];

export function AccountForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = "create",
  members = [],
  allowSharedOwnership,
  currentUserMemberId,
  availableAccounts = [],
}: AccountFormProps) {
  const { isUnifiedPrivacy } = useViewMode();
  // Show owner selector if explicitly allowed or if there are multiple members
  // Hide in unified privacy mode (all accounts are treated as shared)
  const showOwnerSelector = !isUnifiedPrivacy && (allowSharedOwnership ?? members.length > 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<AccountFormData>({
    name: initialData?.name || "",
    type: initialData?.type || "checking",
    balance: initialData?.balance || 0,
    ownerId: initialData?.ownerId,
    creditLimit: initialData?.creditLimit,
    closingDay: initialData?.closingDay,
    dueDay: initialData?.dueDay,
    paymentAccountId: initialData?.paymentAccountId,
    isAutoPayEnabled: initialData?.isAutoPayEnabled,
    icon: initialData?.icon,
    color: initialData?.color,
  });
  const [balanceInput, setBalanceInput] = useState(
    formatAmount(initialData?.balance || 0)
  );
  const [creditLimitInput, setCreditLimitInput] = useState(
    formatAmount(initialData?.creditLimit || 0)
  );

  const isCreditCard = formData.type === "credit_card";

  // Sync form data when initialData changes (e.g., when opening form with pre-selected type)
  useEffect(() => {
    if (initialData) {
      const accountType = ACCOUNT_TYPES.find((t) => t.value === (initialData.type || "checking"));
      setFormData({
        name: initialData.name || "",
        type: initialData.type || "checking",
        balance: initialData.balance || 0,
        ownerId: initialData.ownerId,
        creditLimit: initialData.creditLimit,
        closingDay: initialData.closingDay,
        dueDay: initialData.dueDay,
        paymentAccountId: initialData.paymentAccountId,
        isAutoPayEnabled: initialData.isAutoPayEnabled,
        icon: initialData.icon || accountType?.icon,
        color: initialData.color,
      });
      setBalanceInput(formatAmount(initialData.balance || 0));
      setCreditLimitInput(formatAmount(initialData.creditLimit || 0));
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    if (!formData.name.trim()) {
      newErrors.name = true;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const dataToSubmit: AccountFormData = {
        ...formData,
        balance: parseCurrency(balanceInput),
      };

      if (isCreditCard) {
        dataToSubmit.creditLimit = parseCurrency(creditLimitInput);
        dataToSubmit.paymentAccountId = formData.paymentAccountId;
        dataToSubmit.isAutoPayEnabled = formData.isAutoPayEnabled;
      }

      await onSubmit(dataToSubmit);
      onOpenChange(false);
      setErrors({});

      // Reset form
      setFormData({
        name: "",
        type: "checking",
        balance: 0,
        ownerId: undefined,
        creditLimit: undefined,
        closingDay: undefined,
        dueDay: undefined,
        paymentAccountId: undefined,
        isAutoPayEnabled: undefined,
      });
      setBalanceInput("0,00");
      setCreditLimitInput("0,00");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (type: AccountType) => {
    const accountType = ACCOUNT_TYPES.find((t) => t.value === type);
    setFormData((prev) => ({
      ...prev,
      type,
      icon: accountType?.icon,
      // Reset credit card specific fields when changing away from credit card
      ...(type !== "credit_card" && {
        creditLimit: undefined,
        closingDay: undefined,
        dueDay: undefined,
        paymentAccountId: undefined,
        isAutoPayEnabled: undefined,
      }),
    }));
  };

  const getBalanceLabel = () => {
    if (isCreditCard) {
      return "Fatura Atual";
    }
    return "Saldo Atual";
  };

  const getBalanceDescription = () => {
    if (isCreditCard) {
      return "Quanto já foi gasto no cartão este mês";
    }
    return "Saldo atual da forma de pagamento";
  };

  return (
    <FormModalWrapper
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Nova Forma de Pagamento" : "Editar Forma de Pagamento"}
      description={
        mode === "create"
          ? "Adicione uma nova forma de pagamento ou cartão ao seu orçamento"
          : "Atualize os dados da sua forma de pagamento"
      }
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      submitLabel={mode === "create" ? "Criar" : "Salvar"}
      submitDisabled={!formData.name.trim()}
    >
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="type">Tipo</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleTypeChange(value as AccountType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <span className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>
            Nome
          </Label>
          <Input
            id="name"
            placeholder={
              isCreditCard
                ? "Ex: Nubank Crédito"
                : formData.type === "benefit"
                  ? "Ex: Flash"
                  : formData.type === "savings"
                    ? "Ex: Poupança Itaú"
                    : formData.type === "cash"
                      ? "Ex: Carteira"
                      : formData.type === "investment"
                        ? "Ex: XP Investimentos"
                        : "Ex: Nubank"
            }
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name && e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, name: false }));
              }
            }}
            className={errors.name ? "border-destructive" : ""}
          />
        </div>

        {/* Owner selector - Show for Duo plans or multi-member budgets */}
        {showOwnerSelector && (
          <div className="grid gap-2">
            <Label htmlFor="owner">Proprietário</Label>
            <Select
              value={formData.ownerId || "shared"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  ownerId: value === "shared" ? undefined : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dono da forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shared">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "#9ca3af" }}
                    />
                    <span>Compartilhado</span>
                  </span>
                </SelectItem>
                {members
                  .filter((member) => member.type !== "pet" && (!currentUserMemberId || member.id === currentUserMemberId))
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: member.color || "#6366f1" }}
                        />
                        <span>{member.name}</span>
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Quem é responsável por esta forma de pagamento
            </p>
          </div>
        )}

        {/* Balance + Credit Limit (side by side for credit cards) */}
        <div className={isCreditCard ? "grid grid-cols-2 gap-4" : ""}>
          <div className="grid gap-2">
            <Label htmlFor="balance">{getBalanceLabel()}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="balance"
                className="pl-10"
                placeholder="0,00"
                value={balanceInput}
                onChange={(e) => {
                  // Format as user types - only accept digits
                  const formatted = formatCurrencyFromDigits(e.target.value);
                  setBalanceInput(formatted);
                }}
                onFocus={(e) => {
                  // Clear the input on focus if it's 0,00
                  if (parseCurrency(balanceInput) === 0) {
                    setBalanceInput("");
                  }
                  // Select all text
                  e.target.select();
                }}
                onBlur={() => {
                  // Ensure proper formatting on blur
                  if (!balanceInput.trim()) {
                    setBalanceInput("0,00");
                  }
                }}
              />
            </div>
            {!isCreditCard && (
              <p className="text-xs text-muted-foreground">
                {getBalanceDescription()}
              </p>
            )}
          </div>

          {isCreditCard && (
            <div className="grid gap-2">
              <Label htmlFor="creditLimit">Limite</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="creditLimit"
                  className="pl-10"
                  placeholder="0,00"
                  value={creditLimitInput}
                  onChange={(e) => {
                    const formatted = formatCurrencyFromDigits(e.target.value);
                    setCreditLimitInput(formatted);
                  }}
                  onFocus={(e) => {
                    if (parseCurrency(creditLimitInput) === 0) {
                      setCreditLimitInput("");
                    }
                    e.target.select();
                  }}
                  onBlur={() => {
                    if (!creditLimitInput.trim()) {
                      setCreditLimitInput("0,00");
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {isCreditCard && (
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="closingDay">Dia do Fechamento</Label>
              <DayPicker
                value={formData.closingDay}
                onChange={(day) =>
                  setFormData((prev) => ({ ...prev, closingDay: day }))
                }
                placeholder="Dia"
              />
              <p className="text-xs text-muted-foreground">
                Quando a fatura &quot;vira&quot;
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDay">Dia do Vencimento</Label>
              <DayPicker
                value={formData.dueDay}
                onChange={(day) =>
                  setFormData((prev) => ({ ...prev, dueDay: day }))
                }
                placeholder="Dia"
              />
              <p className="text-xs text-muted-foreground">
                Dia do pagamento
              </p>
            </div>
          </div>
        )}

        {isCreditCard && availableAccounts.length > 0 && (
          <>
            <div className="grid gap-2">
              <Label htmlFor="paymentAccount">Forma de pagamento da fatura</Label>
              <Select
                value={formData.paymentAccountId || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentAccountId: value === "none" ? undefined : value,
                    ...(value === "none" && { isAutoPayEnabled: false }),
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {availableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {getAccountTypeIcon(account.type)} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Forma de pagamento usada para pagar a fatura
              </p>
            </div>

            {formData.paymentAccountId && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="autoPay">Pagamento automatico</Label>
                  <p className="text-xs text-muted-foreground">
                    Pagar fatura no vencimento
                  </p>
                </div>
                <Switch
                  id="autoPay"
                  checked={formData.isAutoPayEnabled ?? false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isAutoPayEnabled: checked }))
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </FormModalWrapper>
  );
}
