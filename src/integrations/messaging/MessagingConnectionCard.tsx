"use client";

import { TelegramConnectionCard } from "@/integrations/telegram/TelegramConnectionCard";
import { WhatsAppConnectionCard } from "@/integrations/whatsapp/WhatsAppConnectionCard";

const MESSAGING_PLATFORM = process.env.NEXT_PUBLIC_MESSAGING_PLATFORM || "telegram";

interface MessagingConnectionCardProps {
  onConnected?: () => void;
}

export function MessagingConnectionCard({ onConnected }: MessagingConnectionCardProps = {}) {
  return (
    <div data-tutorial="messaging-card">
      {MESSAGING_PLATFORM === "whatsapp" ? (
        <WhatsAppConnectionCard onConnected={onConnected} />
      ) : (
        <TelegramConnectionCard onConnected={onConnected} />
      )}
    </div>
  );
}
