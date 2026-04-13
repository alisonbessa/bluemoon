import * as React from "react";
import { Text, Hr, Link } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface WinBackD21Props {
  userName: string;
  replyMailto: string;
  unsubscribeUrl: string;
}

export default function WinBackD21({
  userName,
  replyMailto,
  unsubscribeUrl,
}: WinBackD21Props) {
  return (
    <Layout
      previewText={`O que faltou, ${userName}?`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        Olá, {userName}.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Aqui é o Alison, criador do {appConfig.projectName}. Notei que
        você não acessa o app há cerca de 3 semanas e queria te perguntar
        com sinceridade: o que faltou?
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Estou resolvendo uma necessidade que era minha (organizar as
        finanças junto com a família), mas só faz sentido continuar se o
        {" "}{appConfig.projectName} resolve a necessidade de outras
        pessoas também. Por isso um &ldquo;não funcionou para mim
        porque...&rdquo; seu é, honestamente, o retorno mais valioso que
        posso receber.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Basta responder este e-mail com uma linha — &ldquo;achei
        complicado&rdquo;, &ldquo;não era o que eu esperava&rdquo;,
        &ldquo;esqueci&rdquo;, qualquer resposta ajuda. Se preferir, pode
        também me escrever em{" "}
        <Link href={replyMailto} className="text-primary underline">
          {replyMailto.replace("mailto:", "")}
        </Link>
        .
      </Text>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Obrigado pela honestidade, independentemente da resposta.
      </Text>
    </Layout>
  );
}
