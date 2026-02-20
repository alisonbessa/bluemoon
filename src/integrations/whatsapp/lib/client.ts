import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("whatsapp:client");

// WhatsApp Cloud API v21.0
const WHATSAPP_API = "https://graph.facebook.com/v21.0";

function getConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be configured");
  }
  return { token, phoneNumberId };
}

// ------------------------------------------------------------------
// Low-level API
// ------------------------------------------------------------------

interface WhatsAppAPIResponse {
  messages?: Array<{ id: string }>;
  error?: { message: string; type: string; code: number };
}

async function callWhatsAppAPI<T = WhatsAppAPIResponse>(
  endpoint: string,
  body: object
): Promise<T> {
  const { token } = getConfig();
  const response = await fetch(`${WHATSAPP_API}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (data.error) {
    logger.error("WhatsApp API error", data.error);
    throw new Error(data.error.message || "WhatsApp API error");
  }

  return data as T;
}

// ------------------------------------------------------------------
// Send text message
// ------------------------------------------------------------------

export async function sendTextMessage(to: string, text: string): Promise<string> {
  const { phoneNumberId } = getConfig();
  const data = await callWhatsAppAPI(`${phoneNumberId}/messages`, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body: text },
  });

  return data.messages?.[0]?.id ?? "";
}

// ------------------------------------------------------------------
// Interactive messages (buttons / list)
// ------------------------------------------------------------------

export interface ButtonOption {
  id: string;
  title: string; // max 20 chars
}

export async function sendButtonMessage(
  to: string,
  bodyText: string,
  buttons: ButtonOption[] // max 3
): Promise<string> {
  const { phoneNumberId } = getConfig();
  const data = await callWhatsAppAPI(`${phoneNumberId}/messages`, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });

  return data.messages?.[0]?.id ?? "";
}

export interface ListRow {
  id: string;
  title: string; // max 24 chars
  description?: string; // max 72 chars
}

export async function sendListMessage(
  to: string,
  bodyText: string,
  buttonLabel: string,
  rows: ListRow[] // max 10
): Promise<string> {
  const { phoneNumberId } = getConfig();
  const data = await callWhatsAppAPI(`${phoneNumberId}/messages`, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [
          {
            title: "Opções",
            rows: rows.map((r) => ({
              id: r.id,
              title: r.title.slice(0, 24),
              description: r.description?.slice(0, 72),
            })),
          },
        ],
      },
    },
  });

  return data.messages?.[0]?.id ?? "";
}

// ------------------------------------------------------------------
// Mark as read (acknowledge)
// ------------------------------------------------------------------

export async function markAsRead(messageId: string): Promise<void> {
  const { phoneNumberId } = getConfig();
  await callWhatsAppAPI(`${phoneNumberId}/messages`, {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  });
}

// ------------------------------------------------------------------
// Download media (for voice messages / images)
// ------------------------------------------------------------------

export async function getMediaUrl(mediaId: string): Promise<string> {
  const { token } = getConfig();
  const response = await fetch(`${WHATSAPP_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "Failed to get media URL");
  }
  return data.url;
}

export async function downloadMedia(url: string): Promise<Buffer> {
  const { token } = getConfig();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
