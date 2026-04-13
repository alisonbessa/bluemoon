import * as React from "react";
import { Button, Text, Hr } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface PowerUserFeedbackProps {
  userName: string;
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
      previewText={`${userName}, preciso de 3 minutos do seu tempo`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        Oi, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Aqui é o Alison, criador do {appConfig.projectName}. O app ainda
        está em beta, e você é uma das pessoas que mais tem usado — o que
        já significa muito pra mim.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        O {appConfig.projectName} nasceu de uma dor minha (controle
        financeiro junto com a família) e tem crescido ouvindo pessoas como
        você. Por isso vou pedir um favor: responde um formulário curto
        (3 perguntas, só texto — sem ligação nem vídeo)?
      </Text>

      <Button
        href={surveyUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Responder o formulário
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Se preferir, pode responder esse e-mail direto contando o que você
        mais gosta e o que ainda falta. Eu leio tudo, um a um.
      </Text>
    </Layout>
  );
}
