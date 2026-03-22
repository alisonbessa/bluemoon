"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ArrowRight, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { parseCurrency, formatAmount } from "@/shared/lib/formatters";

export interface IncomeSourceInput {
  name: string;
  amount: string; // display value (formatted)
  type: string;
}

export interface AccountInput {
  name: string;
  type: string;
  closingDay?: number;
  dueDay?: number;
}

interface StepFinancesProps {
  incomeSources: IncomeSourceInput[];
  onIncomeSourcesChange: (sources: IncomeSourceInput[]) => void;
  accounts: AccountInput[];
  onAccountsChange: (accounts: AccountInput[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const INCOME_TYPES = [
  { value: "salary", label: "Salário" },
  { value: "benefit", label: "Benefício (VR/VA)" },
  { value: "freelance", label: "Freelance" },
  { value: "rental", label: "Aluguel" },
  { value: "investment", label: "Rendimentos" },
  { value: "other", label: "Outro" },
];

const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "cash", label: "Dinheiro" },
  { value: "investment", label: "Investimento" },
  { value: "benefit", label: "Benefício (VR/VA)" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function StepFinances({
  incomeSources,
  onIncomeSourcesChange,
  accounts,
  onAccountsChange,
  onNext,
  onBack,
}: StepFinancesProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const updateIncomeSource = (
    index: number,
    field: keyof IncomeSourceInput,
    value: string
  ) => {
    const updated = [...incomeSources];
    updated[index] = { ...updated[index], [field]: value };
    onIncomeSourcesChange(updated);
  };

  const addIncomeSource = () => {
    onIncomeSourcesChange([
      ...incomeSources,
      { name: "", amount: "", type: "salary" },
    ]);
  };

  const removeIncomeSource = (index: number) => {
    if (incomeSources.length <= 1) return;
    onIncomeSourcesChange(incomeSources.filter((_, i) => i !== index));
  };

  const updateAccount = (
    index: number,
    field: keyof AccountInput,
    value: string | number | undefined
  ) => {
    const updated = [...accounts];
    updated[index] = { ...updated[index], [field]: value };
    onAccountsChange(updated);
  };

  const addAccount = () => {
    onAccountsChange([...accounts, { name: "", type: "checking" }]);
  };

  const removeAccount = (index: number) => {
    if (accounts.length <= 1) return;
    onAccountsChange(accounts.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    const newErrors: string[] = [];

    // Validate income sources
    const hasValidIncome = incomeSources.some(
      (s) => s.name && parseCurrency(s.amount) > 0
    );
    if (!hasValidIncome) {
      newErrors.push("Informe pelo menos uma fonte de renda com valor");
    }

    // Validate accounts
    const hasValidAccount = accounts.some((a) => a.name && a.type);
    if (!hasValidAccount) {
      newErrors.push("Informe pelo menos uma conta");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    onNext();
  };

  const totalIncome = incomeSources.reduce(
    (sum, s) => sum + parseCurrency(s.amount),
    0
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Suas finanças</h2>
        <p className="text-muted-foreground">
          Informe sua renda e suas contas principais.
        </p>
      </div>

      {/* Income Sources */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Fontes de renda</Label>
          <Button variant="ghost" size="sm" onClick={addIncomeSource}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {incomeSources.map((source, index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    placeholder="Ex: Salário"
                    value={source.name}
                    onChange={(e) =>
                      updateIncomeSource(index, "name", e.target.value)
                    }
                  />
                </div>
                <div className="w-32">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={source.type}
                    onValueChange={(v) =>
                      updateIncomeSource(index, "type", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCOME_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Valor mensal (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={source.amount}
                    onChange={(e) =>
                      updateIncomeSource(index, "amount", e.target.value)
                    }
                  />
                </div>
                {incomeSources.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIncomeSource(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {totalIncome > 0 && (
          <p className="text-sm text-muted-foreground text-right">
            Renda total: <strong>R$ {formatAmount(totalIncome)}</strong>
          </p>
        )}
      </div>

      {/* Accounts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Contas e cartões</Label>
          <Button variant="ghost" size="sm" onClick={addAccount}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {accounts.map((account, index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    placeholder="Ex: Nubank"
                    value={account.name}
                    onChange={(e) =>
                      updateAccount(index, "name", e.target.value)
                    }
                  />
                </div>
                <div className="w-40">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={account.type}
                    onValueChange={(v) => updateAccount(index, "type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {accounts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="self-end text-muted-foreground hover:text-destructive"
                    onClick={() => removeAccount(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {account.type === "credit_card" && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">Dia de fechamento</Label>
                    <Select
                      value={account.closingDay?.toString() || ""}
                      onValueChange={(v) =>
                        updateAccount(index, "closingDay", parseInt(v))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Dia de vencimento</Label>
                    <Select
                      value={account.dueDay?.toString() || ""}
                      onValueChange={(v) =>
                        updateAccount(index, "dueDay", parseInt(v))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d) => (
                          <SelectItem key={d} value={d.toString()}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="text-sm text-destructive space-y-1">
          {errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button size="lg" onClick={handleNext} className="flex-1">
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
