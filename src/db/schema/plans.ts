import {
  boolean,
  timestamp,
  pgTable,
  text,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod";

export const quotaSchema = z.object({
  permiumSupport: z.boolean().default(true),
  monthlyImages: z.number(),
  somethingElse: z.string(),
});

export type Quotas = z.infer<typeof quotaSchema>;

export const defaultQuotas: Quotas = {
  permiumSupport: false,
  monthlyImages: 10,
  somethingElse: "something",
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

  monthlyPrice: integer("monthlyPrice"),
  monthlyPriceAnchor: integer("monthlyPriceAnchor"),
  monthlyStripePriceId: text("monthlyStripePriceId"),

  yearlyPrice: integer("yearlyPrice"),
  yearlyPriceAnchor: integer("yearlyPriceAnchor"),
  yearlyStripePriceId: text("yearlyStripePriceId"),

  onetimePrice: integer("onetimePrice"),
  onetimePriceAnchor: integer("onetimePriceAnchor"),
  onetimeStripePriceId: text("onetimeStripePriceId"),
  
  quotas: jsonb("quotas").$type<Quotas>(),
});
