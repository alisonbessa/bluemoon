import Stripe from "stripe";
import { users } from "@/db/schema/user";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import getOrCreateUser from "@/shared/lib/users/getOrCreateUser";
import { APIError } from "./helpers";

export async function onCustomerCreated(data: Stripe.Event.Data) {
  const object: Stripe.Customer = data.object;
  if (!object.email) {
    throw new APIError("No email found in customer");
  }
  const { user } = await getOrCreateUser({
    emailId: object.email,
    name: object.name,
  });
  await db
    .update(users)
    .set({ stripeCustomerId: object.id })
    .where(eq(users.id, user.id));
}
