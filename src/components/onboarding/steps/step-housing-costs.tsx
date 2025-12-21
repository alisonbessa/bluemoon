"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OnboardingFooter } from "../onboarding-footer";
import { HousingCostsData } from "../hooks/use-onboarding";

type HousingType = "rent" | "mortgage" | "owned" | "free" | null;

interface StepHousingCostsProps {
  housing: HousingType;
  housingCosts: HousingCostsData;
  onHousingCostsChange: <K extends keyof HousingCostsData>(
    key: K,
    value: HousingCostsData[K]
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

function formatCurrencyInput(value: string): string {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  // Converte para número e divide por 100 para ter os centavos
  const amount = parseInt(digits, 10) / 100;

  // Formata como moeda brasileira
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyInput(value: string): number {
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function StepHousingCosts({
  housing,
  housingCosts,
  onHousingCostsChange,
  onNext,
  onBack,
}: StepHousingCostsProps) {
  const isRent = housing === "rent";
  const isMortgage = housing === "mortgage";
  const isOwned = housing === "owned";
  const showIptu = isRent || isMortgage || isOwned;

  const getTitle = () => {
    if (isRent) return "Detalhes do aluguel";
    if (isMortgage) return "Detalhes do financiamento";
    if (isOwned) return "Custos do imóvel";
    return "Custos de moradia";
  };

  const getSubtitle = () => {
    if (isRent) return "Informe o valor e data de vencimento do seu aluguel";
    if (isMortgage) return "Informe os detalhes do seu financiamento";
    if (isOwned) return "Informe os custos fixos do seu imóvel";
    return "";
  };

  const getIcon = () => {
    if (isRent) return "🏠";
    if (isMortgage) return "🏦";
    if (isOwned) return "🏡";
    return "💰";
  };

  const canProceed = () => {
    if (isRent) {
      return housingCosts.rentAmount > 0 && housingCosts.rentDueDay > 0;
    }
    if (isMortgage) {
      return (
        housingCosts.mortgageCurrentAmount > 0 &&
        housingCosts.mortgageRemainingMonths > 0
      );
    }
    if (isOwned) {
      // Para imóvel quitado, IPTU é opcional
      return true;
    }
    return true;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">{getIcon()}</div>
          <h2 className="text-2xl font-bold mb-2">{getTitle()}</h2>
          <p className="text-muted-foreground">{getSubtitle()}</p>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {/* ALUGUEL */}
          {isRent && (
            <>
              <div className="space-y-2">
                <Label htmlFor="rentAmount">Valor do aluguel</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="rentAmount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    className="pl-10"
                    value={formatCurrencyInput(
                      housingCosts.rentAmount.toString()
                    )}
                    onChange={(e) =>
                      onHousingCostsChange(
                        "rentAmount",
                        parseCurrencyInput(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rentDueDay">Dia do vencimento</Label>
                <Input
                  id="rentDueDay"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="10"
                  value={housingCosts.rentDueDay || ""}
                  onChange={(e) =>
                    onHousingCostsChange(
                      "rentDueDay",
                      Math.min(31, Math.max(1, parseInt(e.target.value) || 0))
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Dia do mês em que o aluguel vence
                </p>
              </div>
            </>
          )}

          {/* FINANCIAMENTO */}
          {isMortgage && (
            <>
              <div className="space-y-2">
                <Label htmlFor="mortgageCurrentAmount">
                  Valor da parcela atual
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="mortgageCurrentAmount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    className="pl-10"
                    value={formatCurrencyInput(
                      housingCosts.mortgageCurrentAmount.toString()
                    )}
                    onChange={(e) =>
                      onHousingCostsChange(
                        "mortgageCurrentAmount",
                        parseCurrencyInput(e.target.value)
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mortgageLastAmount">
                  Valor da última parcela (opcional)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="mortgageLastAmount"
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    className="pl-10"
                    value={formatCurrencyInput(
                      housingCosts.mortgageLastAmount.toString()
                    )}
                    onChange={(e) =>
                      onHousingCostsChange(
                        "mortgageLastAmount",
                        parseCurrencyInput(e.target.value)
                      )
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Se a última parcela for diferente da atual
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mortgageRemainingMonths">
                  Meses restantes
                </Label>
                <Input
                  id="mortgageRemainingMonths"
                  type="number"
                  min={1}
                  placeholder="120"
                  value={housingCosts.mortgageRemainingMonths || ""}
                  onChange={(e) =>
                    onHousingCostsChange(
                      "mortgageRemainingMonths",
                      Math.max(0, parseInt(e.target.value) || 0)
                    )
                  }
                />
              </div>

              <div className="flex items-center space-x-2 p-3 rounded-lg border bg-muted/50">
                <Checkbox
                  id="mortgagePaidThisMonth"
                  checked={housingCosts.mortgagePaidThisMonth}
                  onCheckedChange={(checked) =>
                    onHousingCostsChange(
                      "mortgagePaidThisMonth",
                      checked === true
                    )
                  }
                />
                <Label
                  htmlFor="mortgagePaidThisMonth"
                  className="text-sm font-normal cursor-pointer"
                >
                  Já paguei este mês
                </Label>
              </div>
            </>
          )}

          {/* IPTU (para financiado ou quitado) */}
          {showIptu && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasIptu"
                  checked={housingCosts.hasIptu}
                  onCheckedChange={(checked) =>
                    onHousingCostsChange("hasIptu", checked === true)
                  }
                />
                <Label
                  htmlFor="hasIptu"
                  className="text-sm font-medium cursor-pointer"
                >
                  Pago IPTU
                </Label>
              </div>

              {housingCosts.hasIptu && (
                <div className="space-y-4 pl-6">
                  <RadioGroup
                    value={housingCosts.iptuPaymentType}
                    onValueChange={(value) =>
                      onHousingCostsChange(
                        "iptuPaymentType",
                        value as "single" | "installments"
                      )
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="installments" id="installments" />
                      <Label htmlFor="installments" className="font-normal">
                        Parcelado
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="single" />
                      <Label htmlFor="single" className="font-normal">
                        Parcela única
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="space-y-2">
                    <Label htmlFor="iptuAmount">
                      {housingCosts.iptuPaymentType === "single"
                        ? "Valor total do IPTU"
                        : "Valor da parcela"}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        id="iptuAmount"
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        className="pl-10"
                        value={formatCurrencyInput(
                          housingCosts.iptuAmount.toString()
                        )}
                        onChange={(e) =>
                          onHousingCostsChange(
                            "iptuAmount",
                            parseCurrencyInput(e.target.value)
                          )
                        }
                      />
                    </div>
                  </div>

                  {housingCosts.iptuPaymentType === "installments" && (
                    <div className="space-y-2">
                      <Label htmlFor="iptuInstallments">
                        Número de parcelas
                      </Label>
                      <Input
                        id="iptuInstallments"
                        type="number"
                        min={1}
                        max={12}
                        placeholder="10"
                        value={housingCosts.iptuInstallments || ""}
                        onChange={(e) =>
                          onHousingCostsChange(
                            "iptuInstallments",
                            Math.min(
                              12,
                              Math.max(1, parseInt(e.target.value) || 0)
                            )
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dica para imóvel quitado */}
          {isOwned && !housingCosts.hasIptu && (
            <p className="text-sm text-muted-foreground text-center">
              Você pode adicionar outros custos fixos como condomínio na próxima
              etapa
            </p>
          )}
        </div>
      </div>

      <OnboardingFooter
        onNext={onNext}
        onBack={onBack}
        nextDisabled={!canProceed()}
      />
    </div>
  );
}
