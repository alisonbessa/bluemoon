/**
 * Registry of in-app surveys. The key must match the `surveyKey` stored in
 * `beta_surveys` and the URL path `/app/survey/[key]`.
 */

export type SurveyKey = "power-user-v1";

export interface SurveyDefinition {
  title: string;
  description: string;
}

export const SURVEY_DEFINITIONS: Record<SurveyKey, SurveyDefinition> = {
  "power-user-v1": {
    title: "Um favor de 3 minutos",
    description:
      "Você é uma das pessoas que mais usa o HiveBudget. Sua resposta aqui tem impacto direto no que entra no roadmap.",
  },
};
