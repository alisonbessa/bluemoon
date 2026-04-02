"use client";

import { useState } from "react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { DayPicker } from "@/shared/ui/day-picker";

interface StepFinancesProps {
  isDuo: boolean;
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

export function StepFinances({
  isDuo,
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

  const handleNext = () => {
    const newErrors: string[] = [];

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
        <h2 className="text-2xl font-bold mb-2">Suas contas</h2>
        <p className="text-muted-foreground">
          Cadastre suas contas principais. Rendas e alocações você configura depois.
        </p>
      </div>

      {/* Accounts */}
      <div className="space-y-4">
        {/* Main checking account */}
        <Card>
          <CardContent className="p-4">
            <Label className="text-xs">Conta principal</Label>
            <Input
              placeholder="Ex: Nubank"
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
                    placeholder="Ex: Nubank Crédito"
                    value={creditCardName}
                    onChange={(e) => onCreditCardNameChange(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">Dia de fechamento</Label>
                    <DayPicker
                      value={creditCardClosingDay}
                      onChange={onCreditCardClosingDayChange}
                      placeholder="Fechamento"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Dia de vencimento</Label>
                    <DayPicker
                      value={creditCardDueDay}
                      onChange={onCreditCardDueDayChange}
                      placeholder="Vencimento"
                    />
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
