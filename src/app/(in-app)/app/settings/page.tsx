import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

/**
 * Settings page -- Server Component.
 *
 * Authenticates the user server-side, then renders the client component
 * which handles all data fetching via SWR hooks.
 */
export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return <SettingsClient />;
}
