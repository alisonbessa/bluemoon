import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { announcements } from "@/db/schema/announcements";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  internalError,
  notFoundError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";

const logger = createLogger("api:admin:announcements:item");

// CTA URL aceita tanto URL absoluta (https://...) quanto path interno (/app/...).
const ctaUrlSchema = z
  .string()
  .max(500)
  .refine(
    (v) => /^https?:\/\//.test(v) || v.startsWith("/"),
    { message: "Use uma URL completa (https://...) ou um caminho interno começando com /" }
  )
  .nullable()
  .optional();

const patchSchema = z
  .object({
    title: z.string().min(2).max(120).optional(),
    body: z.string().min(2).max(8000).optional(),
    ctaLabel: z.string().max(60).nullable().optional(),
    ctaUrl: ctaUrlSchema,
    // null = unpublish, ISO string or "now" = publish at that time, undefined = no change
    publish: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nenhum campo para atualizar",
  });

export const PATCH = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Aviso");

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.body !== undefined) updates.body = parsed.data.body;
    if (parsed.data.ctaLabel !== undefined) updates.ctaLabel = parsed.data.ctaLabel;
    if (parsed.data.ctaUrl !== undefined) updates.ctaUrl = parsed.data.ctaUrl;
    if (parsed.data.publish !== undefined) {
      updates.publishedAt = parsed.data.publish ? new Date() : null;
    }

    const [updated] = await db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, id))
      .returning();
    if (!updated) return notFoundError("Aviso");

    return successResponse({ item: updated });
  } catch (error) {
    logger.error("PATCH admin announcement failed", { error: String(error) });
    return internalError("Falha ao atualizar aviso");
  }
});

export const DELETE = withSuperAdminAuthRequired(async (_req, context) => {
  try {
    const params = await context.params;
    const id = params.id as string;
    if (!id) return notFoundError("Aviso");

    const deleted = await db
      .delete(announcements)
      .where(eq(announcements.id, id))
      .returning({ id: announcements.id });
    if (deleted.length === 0) return notFoundError("Aviso");

    return successResponse({ ok: true });
  } catch (error) {
    logger.error("DELETE admin announcement failed", { error: String(error) });
    return internalError("Falha ao excluir aviso");
  }
});
