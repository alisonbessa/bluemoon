"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { OnboardingFooter } from "../onboarding-footer";
import { HousingCostsData } from "../hooks/use-onboarding";

interface StepIptuProps {
  housingCosts: HousingCostsData;
  onHousingCostsChange: <K extends keyof HousingCostsData>(
    key: K,
    value: HousingCostsData[K]
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

function formatCurrencyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = parseInt(digits, 10) / 100;
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

// Calculate remaining IPTU installments from current month to November
function calculateRemainingInstallments(): number {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  // IPTU is typically paid from February to November (10 installments)
  // If we're in month X, remaining installments = 11 - X (capped at 10)
  if (currentMonth >= 11) return 1; // November or December: just 1
  if (currentMonth <= 1) return 10; // January: full 10 installments
  return 11 - currentMonth; // February=9, March=8, ..., October=1
}

export function StepIptu({
  housingCosts,
  onHousingCostsChange,
  onNext,
  onBack,
}: StepIptuProps) {
  const remainingInstallments = calculateRemainingInstallments();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 px-4 overflow-y-auto">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🏠</div>
          <h2 className="text-2xl font-bold mb-2">IPTU</h2>
          <p className="text-muted-foreground">
            Você paga IPTU do seu imóvel?
          </p>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center space-x-2 p-4 rounded-lg border bg-muted/50">
            <Checkbox
              id="hasIptu"
              checked={housingCosts.hasIptu}
              onCheckedChange={(checked) =>
                onHousingCostsChange("hasIptu", checked === true)
              }
            />
            <Label
              htmlFor="hasIptu"
              className="text-base font-medium cursor-pointer"
            >
              Sim, pago IPTU
            </Label>
          </div>

          {housingCosts.hasIptu && (
            <div className="space-y-6 p-4 rounded-lg border">
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
                  <Label htmlFor="installments" className="font-normal cursor-pointer">
                    Parcelado
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single" />
                  <Label htmlFor="single" className="font-normal cursor-pointer">
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
                    Parcelas restantes
                  </Label>
                  <Input
                    id="iptuInstallments"
                    type="number"
                    min={1}
                    max={remainingInstallments}
                    placeholder={remainingInstallments.toString()}
                    value={housingCosts.iptuInstallments || ""}
                    onChange={(e) =>
                      onHousingCostsChange(
                        "iptuInstallments",
                        Math.min(
                          remainingInstallments,
                          Math.max(1, parseInt(e.target.value) || 0)
                        )
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    IPTU geralmente vai até novembro. Restam {remainingInstallments} parcelas este ano.
                  </p>
                </div>
              )}
            </div>
          )}

          {!housingCosts.hasIptu && (
            <p className="text-sm text-muted-foreground text-center">
              Se você não paga IPTU (por exemplo, se está incluído no aluguel), pode continuar.
            </p>
          )}
        </div>
      </div>

      <OnboardingFooter onNext={onNext} onBack={onBack} />
    </div>
  );
}
