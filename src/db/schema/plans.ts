import {
  boolean,
  timestamp,
  pgTable,
  text,
  integer,
  bigint,
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const quotaSchema = z.object({
  maxBudgetMembers: z.number().default(1), // Solo=1, Duo=2 (partners/owners)
  maxDependents: z.number().default(10), // Children / pets per budget
  premiumSupport: z.boolean().default(false),
  monthlyImages: z.number().default(10),
});

export type Quotas = z.infer<typeof quotaSchema>;

export const defaultQuotas: Quotas = {
  maxBudgetMembers: 1,
  maxDependents: 10,
  premiumSupport: false,
  monthlyImages: 10,
};

export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  codename: text("codename").unique(),
  default: boolean("default").default(false),

  requiredCouponCount: integer("requiredCouponCount").default(0), // For LTD plans: Number of coupons required to redeem the plan

  hasOnetimePricing: boolean("hasOnetimePricing").default(false),
  hasMonthlyPricing: boolean("hasMonthlyPricing").default(false),
  hasYearlyPricing: boolean("hasYearlyPricing").default(false),

  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),

  monthlyPrice: bigint("monthlyPrice", { mode: "number" }),
  monthlyPriceAnchor: bigint("monthlyPriceAnchor", { mode: "number" }),
  monthlyStripePriceId: text("monthlyStripePriceId"),

  yearlyPrice: bigint("yearlyPrice", { mode: "number" }),
  yearlyPriceAnchor: bigint("yearlyPriceAnchor", { mode: "number" }),
  yearlyStripePriceId: text("yearlyStripePriceId"),

  onetimePrice: bigint("onetimePrice", { mode: "number" }),
  onetimePriceAnchor: bigint("onetimePriceAnchor", { mode: "number" }),
  onetimeStripePriceId: text("onetimeStripePriceId"),
  
  quotas: jsonb("quotas").$type<Quotas>(),
});
