import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface NoTransactionD3Props {
  userName: string;
  appUrl: string;
  unsubscribeUrl: string;
}

export default function NoTransactionD3({
  userName,
  appUrl,
  unsubscribeUrl,
}: NoTransactionD3Props) {
  return (
    <Layout
      previewText={`${userName}, registre seu primeiro gasto em 10 segundos`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text className="text-foreground text-[16px] leading-[24px]">
        Oi, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Você terminou o setup do {appConfig.projectName}, mas ainda não
        registrou nenhuma transação. Esse é o ponto onde o app começa a
        fazer diferença — ver pra onde o dinheiro está indo.
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[22px] m-0">
          <strong>Dica rápida:</strong> o jeito mais fácil é conectar o
          WhatsApp e mandar uma mensagem do tipo &ldquo;gastei 25 no almoço&rdquo;. O
          assistente cria a transação pra você.
        </Text>
      </Section>

      <Button
        href={`${appUrl}/app/transactions`}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Registrar minha primeira transação
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Travou? Responda esse e-mail que eu ajudo direto.
      </Text>
    </Layout>
  );
}
