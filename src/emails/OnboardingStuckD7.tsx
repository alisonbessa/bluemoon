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
        Oi, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Aqui é o Alison de novo. Passou uma semana e notei que você ainda
        não conseguiu terminar a configuração do {appConfig.projectName}.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        O {appConfig.projectName} ainda está em beta e o seu feedback vale
        ouro pra gente. Você pode me responder só uma dessas perguntas?
      </Text>

      <Text className="text-foreground text-[14px] leading-[22px]">
        • O que te fez parar?
        <br />• Faltou alguma coisa óbvia?
        <br />• Achou confuso, chato, ou simplesmente não teve tempo?
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Pode só responder este e-mail, ou me escrever em{" "}
        <Link href={replyMailto} className="text-primary underline">
          {replyMailto.replace("mailto:", "")}
        </Link>
        . Leio tudo.
      </Text>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Sem pressa e sem cobrança. Se não for pra você, tudo bem — saber o
        motivo já ajuda muito o projeto.
      </Text>
    </Layout>
  );
}
