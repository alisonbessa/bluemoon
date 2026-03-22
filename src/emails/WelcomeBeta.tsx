import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Container } from "@react-email/container";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface WelcomeBetaEmailProps {
  userName: string;
  dashboardUrl: string;
}

export default function WelcomeBeta({ userName, dashboardUrl }: WelcomeBetaEmailProps) {
  return (
    <Html>
      <Layout
        previewText={`Bem-vindo ao time de beta testers do ${appConfig.projectName}!`}
      >
        <Text>
          Olá, {userName}!
        </Text>

        <Text>
          Você é um dos primeiros a usar o {appConfig.projectName}. Obrigado por
          topar essa jornada com a gente!
        </Text>

        <Container className="ml-4 mt-4">
          <Text className="mb-2">
            O que significa ser beta tester:
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Acesso gratuito</strong> a todas as funcionalidades
            enquanto a plataforma estiver em desenvolvimento
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Seu feedback constrói o produto.</strong> Conte pra gente o que
            funciona e o que não funciona
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Desconto exclusivo de lançamento</strong> garantido quando
            sairmos do beta
          </Text>
        </Container>

        <Container className="ml-4 mt-4">
          <Text className="mb-2">
            Primeiros passos:
          </Text>
          <Text className="ml-4 mb-2">1. Escolha seu plano (Solo ou Duo)</Text>
          <Text className="ml-4 mb-2">2. Configure seu orçamento com nosso assistente</Text>
          <Text className="ml-4 mb-2">3. Registre seu primeiro gasto</Text>
        </Container>

        <Text className="mt-4">Vamos lá?</Text>

        <Button
          href={dashboardUrl}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Começar Agora
        </Button>

        <Text className="mt-4 text-muted">
          Encontrou um bug ou tem uma sugestão? Use o botão de feedback
          dentro do app ou responda este email diretamente. Cada mensagem
          sua faz diferença.
        </Text>
      </Layout>
    </Html>
  );
}
