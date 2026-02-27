import type { PrivacyMode } from "@/db/schema/budgets";

export interface PrivacyOption {
  value: PrivacyMode;
  label: string;
  description: string;
}

export const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: "visible",
    label: "Tudo visível",
    description: "Ambos veem todos os gastos e metas pessoais um do outro",
  },
  {
    value: "totals_only",
    label: "Apenas totais",
    description: "Só o total gasto pelo parceiro é visível, sem detalhes",
  },
  {
    value: "private",
    label: "Privado",
    description: "Gastos e metas pessoais ficam completamente ocultos",
  },
];

export const PRIVACY_MAP = Object.fromEntries(
  PRIVACY_OPTIONS.map((o) => [o.value, o])
) as Record<PrivacyMode, PrivacyOption>;
