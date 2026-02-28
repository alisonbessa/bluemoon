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
    value: "unified",
    label: "Unificado",
    description: "Tudo junto como plano solo — só os detalhes das compras individuais ficam ocultos",
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
