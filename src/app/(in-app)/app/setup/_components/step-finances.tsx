"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ArrowRight, ArrowLeft } from "lucide-react";
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
  isDuo: boolean;
  myIncome: string;
  onMyIncomeChange: (value: string) => void;
  partnerIncome: string;
  onPartnerIncomeChange: (value: string) => void;
  mainAccountName: string;
  onMainAccountNameChange: (value: string) => void;
  hasCreditCard: boolean;
  onHasCreditCardChange: (value: boolean) => void;
  creditCardName: string;
  onCreditCardNameChange: (value: string) => void;
  creditCardClosingDay?: number;
  onCreditCardClosingDayChange: (value: number) => void;
  creditCardDueDay?: number;
  onCreditCardDueDayChange: (value: number) => void;
  hasJointAccount: boolean;
  onHasJointAccountChange: (value: boolean) => void;
  jointAccountName: string;
  onJointAccountNameChange: (value: string) => void;
  onNext: () => void;
  onBack?: () => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function StepFinances({
  isDuo,
  myIncome,
  onMyIncomeChange,
  partnerIncome,
  onPartnerIncomeChange,
  mainAccountName,
  onMainAccountNameChange,
  hasCreditCard,
  onHasCreditCardChange,
  creditCardName,
  onCreditCardNameChange,
  creditCardClosingDay,
  onCreditCardClosingDayChange,
  creditCardDueDay,
  onCreditCardDueDayChange,
  hasJointAccount,
  onHasJointAccountChange,
  jointAccountName,
  onJointAccountNameChange,
  onNext,
  onBack,
}: StepFinancesProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const myIncomeCents = parseCurrency(myIncome);
  const partnerIncomeCents = parseCurrency(partnerIncome);
  const totalIncome = myIncomeCents + (isDuo ? partnerIncomeCents : 0);

  const handleNext = () => {
    const newErrors: string[] = [];

    if (myIncomeCents <= 0) {
      newErrors.push("Informe sua renda mensal");
    }

    if (!mainAccountName.trim()) {
      newErrors.push("Informe o nome da sua conta principal");
    }

    if (hasCreditCard && !creditCardName.trim()) {
      newErrors.push("Informe o nome do cartão de crédito");
    }

    if (isDuo && hasJointAccount && !jointAccountName.trim()) {
      newErrors.push("Informe o nome da conta conjunta");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Suas finanças</h2>
        <p className="text-muted-foreground">
          Informe sua renda e suas contas principais.
        </p>
      </div>

      {/* Income */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Renda mensal</Label>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label className="text-xs">
                {isDuo ? "Sua renda (R$)" : "Renda mensal (R$)"}
              </Label>
              <Input
                placeholder="0,00"
                value={myIncome}
                onChange={(e) => onMyIncomeChange(e.target.value)}
              />
            </div>

            {isDuo && (
              <div>
                <Label className="text-xs">Renda do parceiro(a) (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={partnerIncome}
                  onChange={(e) => onPartnerIncomeChange(e.target.value)}
                />
              </div>
            )}

            {totalIncome > 0 && (
              <p className="text-sm text-muted-foreground text-right">
                {isDuo ? "Renda total do casal: " : ""}
                <strong>R$ {formatAmount(totalIncome)}</strong>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Contas</Label>

        {/* Main checking account */}
        <Card>
          <CardContent className="p-4">
            <Label className="text-xs">Conta principal</Label>
            <Input
              placeholder="Ex: Nubank, Itaú, Inter..."
              value={mainAccountName}
              onChange={(e) => onMainAccountNameChange(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Credit card toggle */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Tenho cartão de crédito</Label>
              <Switch
                checked={hasCreditCard}
                onCheckedChange={onHasCreditCardChange}
              />
            </div>

            {hasCreditCard && (
              <>
                <div>
                  <Label className="text-xs">Nome do cartão</Label>
                  <Input
                    placeholder="Ex: Nubank Mastercard"
                    value={creditCardName}
                    onChange={(e) => onCreditCardNameChange(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">Dia de fechamento</Label>
                    <Select
                      value={creditCardClosingDay?.toString() || ""}
                      onValueChange={(v) =>
                        onCreditCardClosingDayChange(parseInt(v))
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
                      value={creditCardDueDay?.toString() || ""}
                      onValueChange={(v) =>
                        onCreditCardDueDayChange(parseInt(v))
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Joint account toggle (Duo only) */}
        {isDuo && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Temos conta conjunta</Label>
                <Switch
                  checked={hasJointAccount}
                  onCheckedChange={onHasJointAccountChange}
                />
              </div>

              {hasJointAccount && (
                <div>
                  <Label className="text-xs">Nome da conta conjunta</Label>
                  <Input
                    placeholder="Ex: Conta conjunta Itaú"
                    value={jointAccountName}
                    onChange={(e) => onJointAccountNameChange(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {errors.length > 0 && (
        <div className="text-sm text-destructive space-y-1">
          {errors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        {onBack && (
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        )}
        <Button size="lg" onClick={handleNext} className="flex-1">
          Próximo
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
