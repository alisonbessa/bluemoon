"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { formatAmount, formatCurrencyFromDigits, parseCurrency } from "@/lib/formatters";
import type { AccountType } from "@/db/schema/accounts";
import type { AccountFormData, AccountOwner } from "./types";

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  initialData?: Partial<AccountFormData>;
  mode?: "create" | "edit";
  members?: AccountOwner[];
}

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "checking", label: "Conta Corrente", icon: "🏦" },
  { value: "savings", label: "Poupança", icon: "🐷" },
  { value: "credit_card", label: "Cartão de Crédito", icon: "💳" },
  { value: "cash", label: "Dinheiro", icon: "💵" },
  { value: "investment", label: "Investimento", icon: "📈" },
  { value: "benefit", label: "Benefício", icon: "🍽️" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function AccountForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = "create",
  members = [],
}: AccountFormProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
    return "Saldo atual da conta";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "Nova Conta" : "Editar Conta"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Adicione uma nova conta ou cartão ao seu orçamento"
                : "Atualize os dados da sua conta"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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
                    ? "Ex: Nubank"
                    : formData.type === "benefit"
                      ? "Ex: VR, VA, Alelo"
                      : "Ex: Banco do Brasil"
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

            {members.length > 0 && (
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
                    <SelectValue placeholder="Selecione o dono da conta" />
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
                      .filter((member) => member.type !== "pet")
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
                  Quem é responsável por esta conta
                </p>
              </div>
            )}

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
              <p className="text-xs text-muted-foreground">
                {getBalanceDescription()}
              </p>
            </div>

            {isCreditCard && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="creditLimit">Limite do Cartão</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="closingDay">Dia do Fechamento</Label>
                    <Select
                      value={formData.closingDay?.toString() || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          closingDay: parseInt(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Quando a fatura &quot;vira&quot;
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dueDay">Dia do Vencimento</Label>
                    <Select
                      value={formData.dueDay?.toString() || ""}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          dueDay: parseInt(value),
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Dia do pagamento
                    </p>
                  </div>
                </div>
              </>
            )}

          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-1/4"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name} className="w-1/4">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Adicionar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
