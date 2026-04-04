import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CreditCardStatementClient } from "@/features/insights/ui/credit-card-statement-client";

export default async function CreditCardStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const { id } = await params;
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year) : new Date().getFullYear();
  const month = sp.month ? parseInt(sp.month) : new Date().getMonth() + 1;

  return <CreditCardStatementClient accountId={id} initialYear={year} initialMonth={month} />;
}
