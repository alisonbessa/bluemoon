import { z } from "zod";

export enum PlanType {
  MONTHLY = "monthly",
  YEARLY = "yearly",
  ONETIME = "onetime",
}

export enum PlanProvider {
  STRIPE = "stripe",
}

const ALLOWED_TRIAL_PERIOD_DAYS = [7, 14, 30];
export const DEFAULT_TRIAL_PERIOD_DAYS = 30;

export const subscribeParams = z.object({
  codename: z.string(),
  type: z.nativeEnum(PlanType),
  provider: z.nativeEnum(PlanProvider),
  trialPeriodDays: z
    .number()
    .optional()
    .refine(
      (n) => {
        if (n === undefined || n === null) {
          return true;
        }
        return ALLOWED_TRIAL_PERIOD_DAYS.includes(n);
      },
      {
        message: `Trial period days must be ${ALLOWED_TRIAL_PERIOD_DAYS.join(", ")}`,
      }
    ),
});

export type SubscribeParams = z.infer<typeof subscribeParams>;

const getSubscribeUrl = ({
  codename,
  type,
  provider,
  trialPeriodDays,
}: SubscribeParams) => {
  let url = `${process.env.NEXT_PUBLIC_APP_URL}/app/subscribe?codename=${codename}&type=${type}&provider=${provider}`;
  if (trialPeriodDays) {
    url += `&trialPeriodDays=${trialPeriodDays}`;
  }
  return url;
};

export default getSubscribeUrl;
