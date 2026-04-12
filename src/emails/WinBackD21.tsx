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
        Oi, {userName}.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Aqui é o Alison, criador do {appConfig.projectName}. Vi que você
        não volta ao app há umas 3 semanas e queria te perguntar, sem
        rodeios: o que faltou?
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Tô resolvendo uma dor que era minha (controle financeiro junto com
        a família), mas só faz sentido continuar se o app resolve a dor de
        outras pessoas também. Por isso o seu &ldquo;não funcionou pra mim
        porque...&rdquo; é o feedback mais valioso que existe.
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Pode só responder este e-mail com uma linha — &ldquo;achei complicado&rdquo;,
        &ldquo;não era o que eu esperava&rdquo;, &ldquo;esqueci&rdquo;, qualquer coisa serve. Ou me
        escreve em{" "}
        <Link href={replyMailto} className="text-primary underline">
          {replyMailto.replace("mailto:", "")}
        </Link>
        .
      </Text>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Obrigado pela honestidade, independente da resposta.
      </Text>
    </Layout>
  );
}
