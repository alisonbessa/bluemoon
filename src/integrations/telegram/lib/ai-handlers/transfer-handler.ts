import type { UserContext, ExtractedTransferData } from "../types";
import {
  sendMessage,
  formatCurrency,
  createConfirmationKeyboard,
} from "../bot";
import { updateTelegramContext } from "./shared-utils";

/**
 * Handle transfer intent - transfer between accounts
 */
export async function handleTransferIntent(
  chatId: number,
  data: ExtractedTransferData,
  confidence: number,
  requiresConfirmation: boolean,
  userContext: UserContext,
  initialMessagesToDelete: number[] = [],
  logId: string | null = null
): Promise<void> {
  if (!data || !data.amount) {
    await sendMessage(chatId, "Não consegui identificar o valor da transferência.");
    return;
  }

  const { accounts } = userContext;

  // Try to match accounts
  const normalizeText = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const fromAccount = data.fromAccountHint
    ? accounts.find((a) =>
        normalizeText(a.name).includes(normalizeText(data.fromAccountHint!)) ||
        normalizeText(data.fromAccountHint!).includes(normalizeText(a.name))
      )
    : undefined;

  const toAccount = data.toAccountHint
    ? accounts.find((a) =>
        normalizeText(a.name).includes(normalizeText(data.toAccountHint!)) ||
        normalizeText(data.toAccountHint!).includes(normalizeText(a.name))
      )
    : undefined;

  if (!fromAccount || !toAccount) {
    await sendMessage(
      chatId,
      `Não consegui identificar as contas.\n\n` +
        `Suas contas disponíveis:\n` +
        accounts.map((a) => `- ${a.name}`).join("\n") +
        `\n\nTente: "transferi 500 de [conta origem] para [conta destino]"`
    );
    return;
  }

  if (fromAccount.id === toAccount.id) {
    await sendMessage(chatId, "As contas de origem e destino devem ser diferentes.");
    return;
  }

  // For now, transfers require confirmation
  const confirmMsgId = await sendMessage(
    chatId,
    `🔄 <b>Confirmar transferência?</b>\n\n` +
      `De: ${fromAccount.name}\n` +
      `Para: ${toAccount.name}\n` +
      `Valor: ${formatCurrency(data.amount)}\n` +
      (data.description ? `Descrição: ${data.description}\n` : ""),
    {
      replyMarkup: createConfirmationKeyboard(),
    }
  );

  await updateTelegramContext(chatId, "AWAITING_CONFIRMATION", {
    pendingTransfer: {
      amount: data.amount,
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      description: data.description,
    },
    messagesToDelete: [...initialMessagesToDelete, confirmMsgId],
    lastAILogId: logId || undefined,
  });
}
