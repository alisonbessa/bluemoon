import { render } from "@react-email/render";
import sendMail from "@/shared/lib/email/sendMail";
import { createLogger } from "@/shared/lib/logger";
import RoadmapStatusUpdate from "@/emails/RoadmapStatusUpdate";
import RoadmapNewSuggestionAdmin from "@/emails/RoadmapNewSuggestionAdmin";
import type { RoadmapStatus } from "@/db/schema/roadmap";
import { getFirstName } from "@/shared/lib/string-utils";

const logger = createLogger("roadmap:notifications");

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  voting: "Em votação",
  planned: "Planejado",
  in_progress: "Em desenvolvimento",
  implemented: "Implementado",
};
const STATUS_DESCRIPTIONS: Record<RoadmapStatus, string> = {
  voting: "Sua ideia está aberta para votos da comunidade beta.",
  planned: "Sua ideia foi aprovada e entrou no backlog.",
  in_progress: "Nossa equipe já está trabalhando nisso.",
  implemented: "Sua ideia foi entregue e já está disponível no produto.",
};

export interface StatusChangeParams {
  toEmail: string;
  toName: string | null;
  itemId: string;
  itemTitle: string;
  newStatus: RoadmapStatus;
  adminNotes?: string | null;
}

export async function notifyAuthorOfStatusChange(params: StatusChangeParams): Promise<void> {
  try {
    const html = await render(
      RoadmapStatusUpdate({
        userName: getFirstName(params.toName),
        itemTitle: params.itemTitle,
        newStatusLabel: STATUS_LABELS[params.newStatus],
        newStatusDescription: STATUS_DESCRIPTIONS[params.newStatus],
        itemUrl: `${appUrl}/app/beta-lab?item=${params.itemId}`,
        adminNotes: params.adminNotes,
      })
    );
    await sendMail(
      params.toEmail,
      `Atualização no Laboratório Beta: ${params.itemTitle}`,
      html
    );
  } catch (error) {
    logger.error("notifyAuthorOfStatusChange failed", { error: String(error) });
  }
}

export interface NewSuggestionParams {
  itemId: string;
  title: string;
  description: string;
  authorName: string | null;
  authorEmail: string | null;
}

export async function notifyAdminsOfNewSuggestion(
  params: NewSuggestionParams
): Promise<void> {
  const emails = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) return;

  try {
    const html = await render(
      RoadmapNewSuggestionAdmin({
        title: params.title,
        description: params.description,
        authorName: params.authorName,
        authorEmail: params.authorEmail,
        adminUrl: `${appUrl}/super-admin/roadmap`,
      })
    );
    const subject = `[Laboratório Beta] Nova sugestão: ${params.title}`;
    await Promise.all(emails.map((to) => sendMail(to, subject, html)));
  } catch (error) {
    logger.error("notifyAdminsOfNewSuggestion failed", { error: String(error) });
  }
}
