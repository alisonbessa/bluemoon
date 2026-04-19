import * as React from "react";
import { Button, Text, Hr } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface PowerUserFeedbackProps {
  userName?: string | null;
  surveyUrl: string;
  unsubscribeUrl: string;
}

export default function PowerUserFeedback({
  userName,
  surveyUrl,
  unsubscribeUrl,
}: PowerUserFeedbackProps) {
  return (
    <Layout
      previewText={
        userName
          ? `${userName}, posso pedir 3 minutos do seu tempo?`
          : "Posso pedir 3 minutos do seu tempo?"
      }
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        {userName ? `Olá, ${userName}.` : "Olá."}
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Aqui é o Alison, criador do {appConfig.projectName}. O app ainda
        está em fase beta e você é uma das pessoas que mais vem usando —
        isso realmente significa muito para mim.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        O {appConfig.projectName} nasceu de uma necessidade que era
        minha: organizar as finanças junto com a família. Ele tem
        evoluído ouvindo pessoas como você. Se puder ajudar, tenho um
        pedido: você responderia um formulário curto, de 3 perguntas?
        Tudo por texto, sem ligação nem vídeo.
      </Text>

      <Button
        href={surveyUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Responder o formulário
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Se preferir, pode simplesmente responder este e-mail contando o
        que mais tem gostado e o que ainda sente falta. Leio cada
        resposta pessoalmente.
      </Text>
    </Layout>
  );
}
