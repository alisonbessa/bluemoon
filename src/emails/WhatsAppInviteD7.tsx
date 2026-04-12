import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface WhatsAppInviteD7Props {
  userName: string;
  connectUrl: string;
  unsubscribeUrl: string;
}

export default function WhatsAppInviteD7({
  userName,
  connectUrl,
  unsubscribeUrl,
}: WhatsAppInviteD7Props) {
  return (
    <Layout
      previewText={`Registre gastos pelo WhatsApp no ${appConfig.projectName}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        Oi, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        A feature que mais muda o dia a dia de quem usa o{" "}
        {appConfig.projectName} é o registro pelo WhatsApp. Em vez de abrir
        o app, você só manda uma mensagem como:
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[22px] m-0">
          &ldquo;almoço 32&rdquo;
          <br />
          &ldquo;mercado 187,50 no cartão&rdquo;
          <br />
          &ldquo;uber 24 dividido com a Ana&rdquo;
        </Text>
      </Section>

      <Text className="text-foreground text-[14px] leading-[24px]">
        O assistente entende, categoriza e registra. Leva menos tempo do
        que salvar o cupom fiscal.
      </Text>

      <Button
        href={connectUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Conectar meu WhatsApp
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Pode testar à vontade — os dados vão direto pro seu orçamento
        existente.
      </Text>
    </Layout>
  );
}
