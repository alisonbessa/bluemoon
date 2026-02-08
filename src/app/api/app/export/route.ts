import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";

const logger = createLogger("api:export");
import { transactions, financialAccounts, categories, incomeSources } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getUserBudgetIds } from "@/shared/lib/api/permissions";
import {
  notFoundError,
  internalError,
} from "@/shared/lib/api/responses";
import { recordAuditLog } from "@/shared/lib/security/audit-log";

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
      return notFoundError("Budgets");
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
      "Descrição",
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
      transfer: "Transferência",
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
        t.isRecurring ? "Sim" : "Não",
        escapeCSV(t.notes),
        t.createdAt ? formatDate(t.createdAt) : "",
      ].join(";");
    });

    const csvContent = [headers.join(";"), ...rows].join("\n");

    void recordAuditLog({
      userId: session.user.id,
      action: "export.data",
      resource: "budget",
      resourceId: budgetIds[0],
      req,
    });

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hivebudget-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error("Error exporting data:", error);
    return internalError("Failed to export data");
  }
});
