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
    description: "Ambos veem tudo um do outro, incluindo transações individuais",
  },
  {
    value: "unified",
    label: "Unificado",
    description: "Vocês compartilham o orçamento como uma conta conjunta. Cada um vê os totais do outro, mas as transações pessoais ficam ocultas.",
  },
  {
    value: "private",
    label: "Privado",
    description: "Contas, metas e transações pessoais ficam completamente ocultos",
  },
];

export const PRIVACY_MAP = Object.fromEntries(
  PRIVACY_OPTIONS.map((o) => [o.value, o])
) as Record<PrivacyMode, PrivacyOption>;
