import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { betaSurveys } from "@/db/schema/email-campaigns";
import { and, eq } from "drizzle-orm";
import { SurveyForm } from "./survey-form";
import { SURVEY_DEFINITIONS, type SurveyKey } from "./surveys";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const definition = SURVEY_DEFINITIONS[key as SurveyKey];

  if (!definition) {
    redirect("/app");
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/?callbackUrl=${encodeURIComponent(`/app/survey/${key}`)}`);
  }

  const [existing] = await db
    .select({ id: betaSurveys.id })
    .from(betaSurveys)
    .where(
      and(
        eq(betaSurveys.userId, session.user.id),
        eq(betaSurveys.surveyKey, key)
      )
    )
    .limit(1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-2">{definition.title}</h1>
      <p className="text-muted-foreground mb-8">{definition.description}</p>

      {existing ? (
        <div className="rounded-lg border bg-muted/30 p-6">
          <p className="font-medium">Obrigado! Sua resposta já foi enviada.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Se quiser complementar, pode responder direto ao e-mail que
            mandamos — eu leio pessoalmente.
          </p>
        </div>
      ) : (
        <SurveyForm surveyKey={key} />
      )}
    </div>
  );
}
