import { GoogleGenerativeAI } from "@google/generative-ai";
import { createLogger } from "@/shared/lib/logger";

const logger = createLogger("roadmap:ai");

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
    client = new GoogleGenerativeAI(apiKey);
  }
  return client;
}

export interface ModerationResult {
  ok: boolean;
  reason?: string;
}

export interface SimilarityCandidate {
  id: string;
  title: string;
  description: string;
}

export interface SimilarityMatch {
  id: string;
  score: number;
  reason: string;
}

function extractJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenceMatch ? fenceMatch[1] : trimmed;
  const objMatch = body.match(/\{[\s\S]*\}/);
  if (!objMatch) return null;
  try {
    return JSON.parse(objMatch[0]) as T;
  } catch {
    return null;
  }
}

/**
 * Approves or rejects the submission. Does NOT rewrite user content.
 * Fails open (allows submission) if AI is unavailable.
 */
export async function moderateSubmission(input: {
  title: string;
  description: string;
}): Promise<ModerationResult> {
  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
        responseMimeType: "application/json",
      },
    });

    const prompt = `Você modera sugestões para um roadmap de produto em português.
Rejeite apenas se houver: linguagem ofensiva, discurso de ódio, spam, promoção comercial, dados pessoais de terceiros, conteúdo ilegal.
Críticas construtivas (mesmo diretas) e erros de ortografia são aceitáveis.

Título: ${JSON.stringify(input.title)}
Descrição: ${JSON.stringify(input.description)}

Responda APENAS JSON no formato:
{"ok": boolean, "reason"?: string}`;

    const result = await model.generateContent(prompt);
    const parsed = extractJson<ModerationResult>(result.response.text());
    if (!parsed) return { ok: true };
    return {
      ok: Boolean(parsed.ok),
      reason: parsed.reason,
    };
  } catch (error) {
    logger.error("moderateSubmission failed, allowing submission", { error: String(error) });
    return { ok: true };
  }
}

/**
 * Returns ids of roadmap items that are semantically similar to the proposal.
 * Uses Gemini to compare against a pre-filtered top-N list (by keyword).
 * Returns empty array on failure.
 */
export async function findSimilarItems(
  proposal: { title: string; description: string },
  candidates: SimilarityCandidate[]
): Promise<SimilarityMatch[]> {
  if (candidates.length === 0) return [];
  try {
    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    });

    const prompt = `Você compara uma nova sugestão com itens já existentes em um roadmap.
Retorne APENAS os itens que tratam essencialmente do mesmo pedido (score >= 0.7).
Ignore coincidências superficiais de palavras-chave.

Nova sugestão:
Título: ${JSON.stringify(proposal.title)}
Descrição: ${JSON.stringify(proposal.description)}

Itens existentes (JSON):
${JSON.stringify(candidates)}

Responda APENAS JSON no formato:
{"matches": [{"id": string, "score": number, "reason": string}]}
Onde score ∈ [0, 1] e reason é uma frase curta em português explicando por que são similares.`;

    const result = await model.generateContent(prompt);
    const parsed = extractJson<{ matches?: SimilarityMatch[] }>(result.response.text());
    if (!parsed?.matches) return [];
    return parsed.matches
      .filter((m) => m && m.id && typeof m.score === "number" && m.score >= 0.7)
      .slice(0, 5);
  } catch (error) {
    logger.error("findSimilarItems failed", { error: String(error) });
    return [];
  }
}
