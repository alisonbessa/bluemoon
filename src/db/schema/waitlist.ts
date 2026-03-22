import { timestamp, pgTable, text, serial, boolean } from "drizzle-orm/pg-core";

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  name: text("name"),
  instagramAccount: text("instagramAccount"),
  email: text("email").unique(),
  betaTester: boolean("betaTester").default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
});
