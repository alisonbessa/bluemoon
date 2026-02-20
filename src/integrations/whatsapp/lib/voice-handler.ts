import { createLogger } from "@/shared/lib/logger";
import { transcribeAudio } from "@/integrations/messaging/lib/gemini";
import { getMediaUrl, downloadMedia } from "./client";
import type { WhatsAppAdapter } from "./whatsapp-adapter";

const logger = createLogger("whatsapp:voice-handler");

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB

export interface VoiceHandlerResult {
  transcription: string | null;
  messagesToDelete: string[];
}

/**
 * Handle a voice/audio message from WhatsApp
 * Downloads the audio, transcribes it via Gemini, and returns the text
 */
export async function handleVoiceMessage(
  adapter: WhatsAppAdapter,
  phoneNumber: string,
  audioId: string,
  mimeType: string
): Promise<VoiceHandlerResult> {
  const messagesToDelete: string[] = [];

  try {
    // Send acknowledgment
    const processingMsgId = await adapter.sendMessage(
      phoneNumber,
      "Processando áudio..."
    );
    messagesToDelete.push(processingMsgId);

    // Get the media URL from WhatsApp
    const mediaUrl = await getMediaUrl(audioId);

    // Download the audio file
    const audioBuffer = await downloadMedia(mediaUrl);

    // Check file size
    if (audioBuffer.length > MAX_AUDIO_SIZE) {
      await adapter.sendMessage(
        phoneNumber,
        "O arquivo de áudio é muito grande. Envie um áudio de até 60 segundos."
      );
      return { transcription: null, messagesToDelete: [] };
    }

    // Transcribe with Gemini
    const normalizedMime = mimeType || "audio/ogg";
    const transcription = await transcribeAudio(audioBuffer, normalizedMime);

    // Check for transcription errors
    if (transcription === "AUDIO_NAO_COMPREENDIDO" || !transcription) {
      await adapter.sendMessage(
        phoneNumber,
        "Não consegui entender o áudio. Tente falar mais claramente ou envie uma mensagem de texto."
      );
      return { transcription: null, messagesToDelete: [] };
    }

    // Send transcription confirmation
    const transcriptionMsgId = await adapter.sendMessage(
      phoneNumber,
      `Entendi: "${transcription}"\n\nProcessando...`
    );
    messagesToDelete.push(transcriptionMsgId);

    return { transcription, messagesToDelete };
  } catch (error) {
    logger.error("Error processing voice message", error);
    await adapter.sendMessage(
      phoneNumber,
      "Erro ao processar o áudio. Tente enviar uma mensagem de texto."
    );
    return { transcription: null, messagesToDelete: [] };
  }
}
