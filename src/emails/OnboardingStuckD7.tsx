import * as React from "react";
import { Text, Hr, Link } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface OnboardingStuckD7Props {
  userName: string;
  replyMailto: string;
  unsubscribeUrl: string;
}

export default function OnboardingStuckD7({
  userName,
  replyMailto,
  unsubscribeUrl,
}: OnboardingStuckD7Props) {
  return (
    <Layout
      previewText={`${userName}, o que te fez parar no ${appConfig.projectName}?`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        Olá, {userName}.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Aqui é o Alison de novo. Já faz uma semana desde que você criou a
        conta e notei que a configuração do {appConfig.projectName} ainda
        não foi concluída.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        O app ainda está em fase beta, então o seu retorno tem um peso
        enorme para o que vem a seguir. Se puder, me ajude respondendo
        uma destas perguntas:
      </Text>

      <Text className="text-foreground text-[14px] leading-[22px]">
        • O que te fez parar?
        <br />• Faltou algo que você esperava encontrar?
        <br />• Achou confuso, ou foi só questão de não ter tido tempo?
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Você pode responder este e-mail diretamente, ou me escrever em{" "}
        <Link href={replyMailto} className="text-primary underline">
          {replyMailto.replace("mailto:", "")}
        </Link>
        . Leio cada mensagem pessoalmente.
      </Text>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Sem pressão nenhuma. Se o {appConfig.projectName} não for para
        você, tudo bem — saber o motivo já é uma grande ajuda para o
        projeto.
      </Text>
    </Layout>
  );
}
