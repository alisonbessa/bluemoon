import withAuthRequired from "@/lib/auth/withAuthRequired";
import { db } from "@/db";
import { transactions, budgetMembers, financialAccounts, categories, incomeSources } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

// Helper to get user's budget IDs
async function getUserBudgetIds(userId: string) {
  const memberships = await db
    .select({ budgetId: budgetMembers.budgetId })
    .from(budgetMembers)
    .where(eq(budgetMembers.userId, userId));
  return memberships.map((m) => m.budgetId);
}

// Convert cents to currency format
function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

// Escape CSV field
function escapeCSV(field: string | null | undefined): string {
  if (!field) return "";
  // If field contains comma, newline or quote, wrap in quotes and escape internal quotes
  if (field.includes(",") || field.includes("\n") || field.includes('"')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export const GET = withAuthRequired(async (req, context) => {
  const { session } = context;

  try {
    const budgetIds = await getUserBudgetIds(session.user.id);

    if (budgetIds.length === 0) {
      return NextResponse.json({ error: "No budgets found" }, { status: 404 });
    }

    // Fetch all transactions with related data
    const allTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        status: transactions.status,
        amount: transactions.amount,
        description: transactions.description,
        notes: transactions.notes,
        date: transactions.date,
        accountName: financialAccounts.name,
        categoryName: categories.name,
        incomeSourceName: incomeSources.name,
        isInstallment: transactions.isInstallment,
        installmentNumber: transactions.installmentNumber,
        totalInstallments: transactions.totalInstallments,
        isRecurring: transactions.isRecurring,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(financialAccounts, eq(transactions.accountId, financialAccounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(incomeSources, eq(transactions.incomeSourceId, incomeSources.id))
      .where(inArray(transactions.budgetId, budgetIds))
      .orderBy(transactions.date);

    // Build CSV content
    const headers = [
      "Data",
      "Tipo",
      "Status",
      "Valor",
      "Descricao",
      "Conta",
      "Categoria",
      "Fonte de Renda",
      "Parcelamento",
      "Recorrente",
      "Notas",
      "Criado em",
    ];

    const typeLabels: Record<string, string> = {
      income: "Receita",
      expense: "Despesa",
      transfer: "Transferencia",
    };

    const statusLabels: Record<string, string> = {
      pending: "Pendente",
      cleared: "Realizado",
      reconciled: "Conciliado",
    };

    const rows = allTransactions.map((t) => {
      const installmentInfo = t.isInstallment && t.installmentNumber && t.totalInstallments
        ? `${t.installmentNumber}/${t.totalInstallments}`
        : "";

      return [
        formatDate(t.date),
        typeLabels[t.type] || t.type,
        statusLabels[t.status] || t.status,
        formatAmount(t.amount),
        escapeCSV(t.description),
        escapeCSV(t.accountName),
        escapeCSV(t.categoryName),
        escapeCSV(t.incomeSourceName),
        installmentInfo,
        t.isRecurring ? "Sim" : "Nao",
        escapeCSV(t.notes),
        t.createdAt ? formatDate(t.createdAt) : "",
      ].join(";");
    });

    const csvContent = [headers.join(";"), ...rows].join("\n");

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hivebudget-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
});
