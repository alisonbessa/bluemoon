import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken } from "@/shared/lib/email/unsubscribe-token";
import { createLogger } from "@/shared/lib/logger";
import { appConfig } from "@/shared/lib/config";

const logger = createLogger("api:unsubscribe");

export const dynamic = "force-dynamic";

/**
 * GET /api/unsubscribe?token=...
 *
 * Stateless opt-out for retention email campaigns. The token is an HMAC-signed
 * user id, so the user does not need to be logged in to use it.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const userId = verifyUnsubscribeToken(token);

  if (!userId) {
    return htmlResponse(
      "Link inválido",
      `<p>Este link de descadastro é inválido ou foi corrompido. Se você continua recebendo e-mails que não deseja, responda ao último e-mail que enviamos e vamos resolver manualmente.</p>`,
      400
    );
  }

  try {
    const result = await db
      .update(users)
      .set({ unsubscribedFromCampaignsAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (result.length === 0) {
      return htmlResponse(
        "Conta não encontrada",
        `<p>Não encontramos uma conta associada a este link. Talvez ela já tenha sido removida.</p>`,
        404
      );
    }

    logger.info("User unsubscribed from campaigns", { userId });

    return htmlResponse(
      "Pronto!",
      `<p>Você não receberá mais e-mails de engajamento e retenção do ${appConfig.projectName}.</p>
       <p>E-mails transacionais (como autenticação, lembretes de trial e convites) continuarão sendo enviados, pois são necessários para o uso da plataforma.</p>
       <p>Se mudar de ideia, é só entrar em contato pelo suporte.</p>`
    );
  } catch (error) {
    logger.error("Failed to unsubscribe user", error, { userId });
    return htmlResponse(
      "Ops",
      `<p>Algo deu errado. Tente novamente em instantes ou entre em contato pelo suporte.</p>`,
      500
    );
  }
}

function htmlResponse(title: string, body: string, status = 200) {
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} · ${appConfig.projectName}</title>
  <meta name="robots" content="noindex" />
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background:#f9fafb; color:#111827; }
    main { max-width: 520px; margin: 60px auto; padding: 32px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; }
    h1 { font-size: 22px; margin: 0 0 16px; }
    p { font-size: 15px; line-height: 1.55; color:#374151; }
    a { color: #22c55e; }
    .brand { font-weight:600; color:#22c55e; margin-bottom:12px; }
  </style>
</head>
<body>
  <main>
    <div class="brand">${appConfig.projectName}</div>
    <h1>${title}</h1>
    ${body}
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
