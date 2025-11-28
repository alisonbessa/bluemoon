"use client";

import { useState } from "react";
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
import type { AccountType } from "@/db/schema/accounts";
import type { AccountFormData } from "./types";

interface AccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  initialData?: Partial<AccountFormData>;
  mode?: "create" | "edit";
}

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string }[] = [
  { value: "checking", label: "Conta Corrente", icon: "🏦" },
  { value: "savings", label: "Poupança", icon: "🐷" },
  { value: "credit_card", label: "Cartão de Crédito", icon: "💳" },
  { value: "cash", label: "Dinheiro", icon: "💵" },
  { value: "investment", label: "Investimento", icon: "📈" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}

export function AccountForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = "create",
}: AccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AccountFormData>({
    name: initialData?.name || "",
    type: initialData?.type || "checking",
    balance: initialData?.balance || 0,
    creditLimit: initialData?.creditLimit,
    closingDay: initialData?.closingDay,
    dueDay: initialData?.dueDay,
    icon: initialData?.icon,
    color: initialData?.color,
  });
  const [balanceInput, setBalanceInput] = useState(
    formatCurrency(initialData?.balance || 0)
  );
  const [creditLimitInput, setCreditLimitInput] = useState(
    formatCurrency(initialData?.creditLimit || 0)
  );

  const isCreditCard = formData.type === "credit_card";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Reset form
      setFormData({
        name: "",
        type: "checking",
        balance: 0,
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
      // Reset credit card fields if not credit card
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
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder={isCreditCard ? "Ex: Nubank" : "Ex: Banco do Brasil"}
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

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
                  onChange={(e) => setBalanceInput(e.target.value)}
                  onBlur={() =>
                    setBalanceInput(formatCurrency(parseCurrency(balanceInput)))
                  }
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
                      onChange={(e) => setCreditLimitInput(e.target.value)}
                      onBlur={() =>
                        setCreditLimitInput(
                          formatCurrency(parseCurrency(creditLimitInput))
                        )
                      }
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Adicionar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
