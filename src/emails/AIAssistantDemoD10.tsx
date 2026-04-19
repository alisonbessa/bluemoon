import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface AIAssistantDemoD10Props {
  userName?: string | null;
  appUrl: string;
  unsubscribeUrl: string;
}

export default function AIAssistantDemoD10({
  userName,
  appUrl,
  unsubscribeUrl,
}: AIAssistantDemoD10Props) {
  return (
    <Layout
      previewText={
        userName
          ? `${userName}, você ainda não testou o assistente de IA`
          : "Você ainda não testou o assistente de IA"
      }
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        {userName ? `Olá, ${userName}.` : "Olá."}
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Você está usando o {appConfig.projectName}, mas ainda não
        experimentou o assistente de IA. É a parte do app que a maior
        parte dos usuários considera o diferencial depois que testa pela
        primeira vez.
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[22px] m-0">
          <strong>Exemplos do que você pode perguntar:</strong>
          <br />
          &bull; &ldquo;Quanto gastei com mercado este mês?&rdquo;
          <br />
          &bull; &ldquo;Cria um gasto de 45 reais com farmácia&rdquo;
          <br />
          &bull; &ldquo;Qual foi meu maior gasto na semana passada?&rdquo;
        </Text>
      </Section>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Você pode conversar com o assistente diretamente no app ou pelo
        WhatsApp.
      </Text>

      <Button
        href={`${appUrl}/app`}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Testar o assistente
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Se tiver alguma ideia do que gostaria que ele fizesse e ainda não
        faz, basta responder este e-mail. Sugestões assim entram direto
        na lista de prioridades do roadmap.
      </Text>
    </Layout>
  );
}
