import withSuperAdminAuthRequired from "@/shared/lib/auth/withSuperAdminAuthRequired";
import { createLogger } from "@/shared/lib/logger";
import { db } from "@/db";
import { announcements } from "@/db/schema/announcements";
import { desc } from "drizzle-orm";
import { z } from "zod";
import {
  internalError,
  successResponse,
  validationError,
} from "@/shared/lib/api/responses";

const logger = createLogger("api:admin:announcements");

// CTA URL aceita tanto URL absoluta (https://...) quanto path interno (/app/...),
// já que o modal é renderizado dentro do app e o domínio varia entre ambientes.
const ctaUrlSchema = z
  .string()
  .max(500)
  .refine(
    (v) => /^https?:\/\//.test(v) || v.startsWith("/"),
    { message: "Use uma URL completa (https://...) ou um caminho interno começando com /" }
  )
  .optional()
  .nullable();

const createSchema = z.object({
  title: z.string().min(2).max(120),
  body: z.string().min(2).max(8000),
  ctaLabel: z.string().max(60).optional().nullable(),
  ctaUrl: ctaUrlSchema,
  publish: z.boolean().optional().default(false),
});

export const GET = withSuperAdminAuthRequired(async () => {
  try {
    const items = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt))
      .limit(200);
    return successResponse({ items });
  } catch (error) {
    logger.error("GET admin announcements failed", { error: String(error) });
    return internalError("Falha ao carregar avisos");
  }
});

export const POST = withSuperAdminAuthRequired(async (req, context) => {
  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { publish, ...data } = parsed.data;
    const [created] = await db
      .insert(announcements)
      .values({
        title: data.title,
        body: data.body,
        ctaLabel: data.ctaLabel ?? null,
        ctaUrl: data.ctaUrl ?? null,
        publishedAt: publish ? new Date() : null,
        createdById: context.session.user?.id ?? null,
      })
      .returning();

    return successResponse({ item: created }, 201);
  } catch (error) {
    logger.error("POST admin announcements failed", { error: String(error) });
    return internalError("Falha ao criar aviso");
  }
});
