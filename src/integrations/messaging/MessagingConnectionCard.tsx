"use client";

import { TelegramConnectionCard } from "@/integrations/telegram/TelegramConnectionCard";
import { WhatsAppConnectionCard } from "@/integrations/whatsapp/WhatsAppConnectionCard";

const MESSAGING_PLATFORM = process.env.NEXT_PUBLIC_MESSAGING_PLATFORM || "telegram";

export function MessagingConnectionCard() {
  if (MESSAGING_PLATFORM === "whatsapp") {
    return <WhatsAppConnectionCard />;
  }

  return <TelegramConnectionCard />;
}
