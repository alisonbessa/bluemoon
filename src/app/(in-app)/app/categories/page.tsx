import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CategoriesClient } from "@/features/categories/ui/categories-client";

/**
 * Categories page -- Server Component.
 *
 * Authenticates the user server-side, then renders the client component
 * which handles all data fetching via SWR hooks.
 */
export default async function CategoriesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <CategoriesClient />;
}
