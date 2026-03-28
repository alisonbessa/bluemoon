import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GoalsClient } from "@/features/goals/ui/goals-client";

/**
 * Goals page -- Server Component.
 *
 * Authenticates the user server-side, then renders the client component
 * which handles all data fetching via SWR hooks.
 */
export default async function GoalsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <GoalsClient />;
}
