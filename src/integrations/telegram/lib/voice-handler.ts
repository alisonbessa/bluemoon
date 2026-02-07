import type { TelegramVoice } from "./types";
import { getFile, downloadFile, sendMessage } from "./bot";
import { transcribeAudio } from "./gemini";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("telegram:voice-handler");

export interface VoiceHandlerResult {
  transcription: string | null;
  messagesToDelete: number[];
}

/**
 * Handle a voice message from Telegram
 * Downloads the audio, transcribes it, and returns the text
 */
export async function handleVoiceMessage(
  chatId: number,
  voice: TelegramVoice
): Promise<VoiceHandlerResult> {
  const messagesToDelete: number[] = [];

  try {
    // Send acknowledgment
    const processingMsgId = await sendMessage(chatId, "🎙️ Processando áudio...");
    messagesToDelete.push(processingMsgId);

    // Get file info from Telegram
    const fileInfo = await getFile(voice.file_id);

    if (!fileInfo.file_path) {
      await sendMessage(chatId, "❌ Não consegui acessar o arquivo de áudio.");
      return { transcription: null, messagesToDelete: [] };
    }

    // Download the audio file
    const audioBuffer = await downloadFile(fileInfo.file_path);

    // Determine mime type
    const mimeType = voice.mime_type || "audio/ogg";

    // Transcribe with Gemini
    const transcription = await transcribeAudio(audioBuffer, mimeType);

    // Check for transcription errors
    if (transcription === "AUDIO_NAO_COMPREENDIDO" || !transcription) {
      await sendMessage(
        chatId,
        "❌ Não consegui entender o áudio. Tente falar mais claramente ou envie uma mensagem de texto."
      );
      return { transcription: null, messagesToDelete: [] };
    }

    // Send transcription confirmation
    const transcriptionMsgId = await sendMessage(chatId, `📝 Entendi: "${transcription}"\n\nProcessando...`);
    messagesToDelete.push(transcriptionMsgId);

    return { transcription, messagesToDelete };
  } catch (error) {
    logger.error("[Voice Handler] Error processing voice message:", error);
    await sendMessage(
      chatId,
      "❌ Erro ao processar o áudio. Tente enviar uma mensagem de texto."
    );
    return { transcription: null, messagesToDelete: [] };
  }
}

/**
 * Check if audio duration is within acceptable limits
 */
export function isValidAudioDuration(duration: number): boolean {
  // Max 60 seconds for voice messages
  return duration > 0 && duration <= 60;
}

/**
 * Check if audio file size is within limits
 */
export function isValidAudioSize(fileSize: number | undefined): boolean {
  // Max 10MB
  const maxSize = 10 * 1024 * 1024;
  return !fileSize || fileSize <= maxSize;
}
