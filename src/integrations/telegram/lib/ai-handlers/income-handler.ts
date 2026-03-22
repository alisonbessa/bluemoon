import { db } from "@/db";
import { transactions } from "@/db/schema";
import type { UserContext, ExtractedIncomeData } from "../types";
import { matchIncomeSource, CONFIDENCE_THRESHOLDS } from "../gemini";
import { markLogAsConfirmed } from "../ai-logger";
import {
  findMatchingScheduledIncome,
  findScheduledIncomeByHint,
} from "../transaction-matcher";
import { getTodayNoonUTC } from "../telegram-utils";
import { capitalizeFirst } from "@/shared/lib/string-utils";
import {
  sendMessage,
  formatCurrency,
  createConfirmationKeyboard,
  deleteMessages,
} from "../bot";
import { updateTelegramContext, matchAccount } from "./shared-utils";

/**
 * Handle income intent - register or update income
 */
export async function handleIncomeIntent(
  chatId: number,
  data: ExtractedIncomeData,
  confidence: number,
  requiresConfirmation: boolean,
  userContext: UserContext,
  initialMessagesToDelete: number[] = [],
  logId: string | null = null
): Promise<void> {
  const { budgetId, memberId, defaultAccountId, incomeSources, accounts, currentYear, currentMonth } = userContext;

  if (!defaultAccountId) {
    await sendMessage(
      chatId,
      "Você precisa configurar uma conta padrão no app primeiro."
    );
    return;
  }

  // Try to match income source
  const sourceMatch = matchIncomeSource(data?.incomeSourceHint, incomeSources);
  const incomeSourceId = sourceMatch?.incomeSource.id;
  const incomeSourceName = sourceMatch?.incomeSource.name;

  // Try to match account from hint (e.g., "recebi salário na conta do itaú")
  const matchedAccount = data?.accountHint ? matchAccount(data.accountHint, accounts) : null;
  const accountId = matchedAccount?.id || defaultAccountId;

  // CASE 1: No amount provided (null, undefined, or 0) - try to find a scheduled transaction
  // AI sometimes returns 0 instead of null when no amount is mentioned
  if (!data?.amount || data.amount === 0) {
    // Try to find a scheduled income by hint
    const scheduledByHint = await findScheduledIncomeByHint(
      budgetId,
      incomeSourceId || null,
      data?.description || data?.incomeSourceHint || null,
      currentYear,
      currentMonth
    );

    if (scheduledByHint && scheduledByHint.confidence >= 0.5) {
      // Found a matching scheduled income - ask for confirmation
      const tx = scheduledByHint.transaction;
      const txSourceName = tx.incomeSourceName || incomeSourceName || "Receita";

      let message = `💵 <b>Confirmar receita?</b>\n\n`;
      message += `Fonte: ${txSourceName}\n`;
      message += `Valor: ${formatCurrency(tx.amount)}\n`;
      if (tx.description) {
        message += `Descrição: ${tx.description}\n`;
      }
      message += `\n💡 Encontrei esta receita agendada. Deseja marcá-la como recebida?`;

      const confirmMsgId = await sendMessage(chatId, message, {
        replyMarkup: createConfirmationKeyboard(),
      });

      await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
        pendingIncome: {
          amount: tx.amount,
          description: tx.description || undefined,
          incomeSourceId: tx.incomeSourceId || incomeSourceId,
          incomeSourceName: txSourceName,
          accountId,
        },
        scheduledTransactionId: tx.id, // Store ID to update existing transaction
        messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
        lastAILogId: logId || undefined,
      });
      return;
    }

    // No scheduled income found
    await sendMessage(
      chatId,
      "Não encontrei uma receita agendada correspondente.\n\n" +
        "Por favor, informe o valor. Exemplo:\n" +
        `"recebi 5000 de salário"`
    );
    return;
  }

  // CASE 2: Amount provided - check for matching scheduled income
  const scheduledMatch = await findMatchingScheduledIncome(
    budgetId,
    incomeSourceId || null,
    data.amount,
    currentYear,
    currentMonth
  );

  const finalConfidence = confidence * (sourceMatch?.confidence || 0.7);

  // HIGH CONFIDENCE without scheduled match: Auto-save new transaction
  // Note: We NEVER auto-save when updating scheduled transactions - always confirm
  if (finalConfidence >= CONFIDENCE_THRESHOLDS.HIGH && !scheduledMatch) {
    // Delete processing messages before showing final result
    if (initialMessagesToDelete.length > 0) {
      await deleteMessages(chatId, initialMessagesToDelete);
    }

    const capitalizedDescription = capitalizeFirst(data.description);

    // Create new income transaction
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        budgetId,
        accountId,
        incomeSourceId,
        memberId,
        type: "income",
        status: "cleared",
        amount: data.amount,
        description: capitalizedDescription || incomeSourceName,
        date: data.date || getTodayNoonUTC(),
        source: "telegram",
      })
      .returning();

    await updateTelegramContext(chatId, "IDLE", {
      lastTransactionId: newTransaction.id,
    });

    if (logId) await markLogAsConfirmed(logId);

    await sendMessage(
      chatId,
      `✅ <b>Receita registrada!</b>\n\n` +
        (incomeSourceName ? `Fonte: ${incomeSourceName}\n` : "") +
        `Valor: ${formatCurrency(data.amount)}\n` +
        (capitalizedDescription ? `Descrição: ${capitalizedDescription}\n\n` : "\n") +
        `Use /desfazer para remover.`
    );
    return;
  }

  // MEDIUM/LOW CONFIDENCE: Ask for confirmation
  let message = `💵 <b>Confirmar receita?</b>\n\n`;
  if (incomeSourceName) {
    message += `Fonte: ${incomeSourceName}\n`;
  }
  message += `Valor: ${formatCurrency(data.amount)}\n`;
  if (data.description) {
    message += `Descrição: ${data.description}\n`;
  }

  if (scheduledMatch && scheduledMatch.confidence >= 0.4) {
    message += `\n💡 Encontrei uma receita agendada similar que será atualizada.`;
  }

  const confirmMsgId = await sendMessage(chatId, message, {
    replyMarkup: createConfirmationKeyboard(),
  });

  await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
    pendingIncome: {
      amount: data.amount,
      description: data.description,
      incomeSourceId,
      incomeSourceName,
      accountId,
    },
    scheduledTransactionId: scheduledMatch?.transaction.id,
    messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
    lastAILogId: logId || undefined,
  });
}
