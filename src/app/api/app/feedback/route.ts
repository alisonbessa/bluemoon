import withAuthRequired from "@/shared/lib/auth/withAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { feedbacks } from "@/db/schema/feedback";
import { z } from "zod";
import {
  validationError,
  successResponse,
  internalError,
} from "@/shared/lib/api/responses";

const logger = createLogger("api:feedback");

const feedbackSchema = z.object({
  type: z.enum(["bug", "suggestion", "other"]),
  message: z.string().min(5, "Mensagem deve ter pelo menos 5 caracteres").max(2000),
  page: z.string().optional(),
});

export const POST = withAuthRequired(async (req, context) => {
  try {
    const { session } = context;
    const body = await req.json();

    const result = feedbackSchema.safeParse(body);
    if (!result.success) {
      return validationError(result.error);
    }

    const { type, message, page } = result.data;

    const [feedback] = await db
      .insert(feedbacks)
      .values({
        userId: session.user.id,
        type,
        message,
        page: page || null,
      })
      .returning();

    logger.info(`Feedback created by user ${session.user.id}: ${type}`);

    return successResponse({ feedback }, 201);
  } catch (error) {
    logger.error("Error creating feedback:", error);
    return internalError("Falha ao enviar feedback");
  }
});
