import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Container } from "@react-email/container";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface WelcomeBetaEmailProps {
  userName?: string | null;
  dashboardUrl: string;
}

export default function WelcomeBeta({ userName, dashboardUrl }: WelcomeBetaEmailProps) {
  return (
    <Html>
      <Layout
        previewText={`Bem-vindo ao time de beta testers do ${appConfig.projectName}!`}
      >
        <Text>
          {userName ? `Oi, ${userName}! Tudo bem?` : "Oi! Tudo bem?"}
        </Text>

        <Text>
          Que bom ter você aqui! Você é um dos primeiros a usar o{" "}
          {appConfig.projectName} e isso significa muito pra gente.
        </Text>

        <Text>
          A ideia do {appConfig.projectName} é simples: construir uma
          plataforma que resolve problemas reais de quem quer organizar a
          vida financeira. E pra isso, nada melhor do que feedbacks reais e
          sinceros de quem está usando no dia a dia.
        </Text>

        <Text>
          Então fica à vontade! Toda sugestão é bem-vinda, seja uma ideia
          nova, algo que ficou confuso, ou um "isso aqui podia ser diferente".
          Não existe feedback pequeno.
        </Text>

        <Container className="ml-4 mt-4">
          <Text className="mb-2">
            O que você ganha como beta tester:
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Acesso gratuito</strong> a tudo enquanto estivermos em
            desenvolvimento
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Voz ativa</strong> no que a gente constrói a seguir
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Desconto exclusivo</strong> garantido quando sairmos do
            beta
          </Text>
        </Container>

        <Container className="ml-4 mt-4">
          <Text className="mb-2">
            Pra começar é bem rápido:
          </Text>
          <Text className="ml-4 mb-2">1. Escolha seu plano (Solo ou Duo)</Text>
          <Text className="ml-4 mb-2">2. Configure seu orçamento com nosso assistente</Text>
          <Text className="ml-4 mb-2">3. Registre seu primeiro gasto</Text>
        </Container>

        <Text className="mt-4">Bora?</Text>

        <Button
          href={dashboardUrl}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Começar Agora
        </Button>

        <Text className="mt-4 text-muted">
          Encontrou um bug, teve uma ideia ou quer desabafar sobre algo que
          não curtiu? Use o botão de feedback dentro do app ou responda este
          email. A gente lê tudo e leva a sério cada mensagem.
        </Text>
      </Layout>
    </Html>
  );
}
