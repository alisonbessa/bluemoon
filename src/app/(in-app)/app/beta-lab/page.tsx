import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { canAccessBetaLab } from "@/features/roadmap/constants";
import { BetaLabClient } from "@/features/roadmap/ui/beta-lab-client";

export const dynamic = "force-dynamic";

export default async function BetaLabPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!canAccessBetaLab(user?.role)) {
    redirect("/app");
  }

  return <BetaLabClient />;
}
