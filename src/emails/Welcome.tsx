import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Container } from "@react-email/container";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export default function Welcome({ userName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Layout
        previewText={`Bem-vindo ao ${appConfig.projectName}, ${userName}! 🎉`}
      >
        <Text>
          Olá, {userName}! 👋
        </Text>

        <Text>
          Seja muito bem-vindo ao {appConfig.projectName}! Estamos felizes em ter você por aqui.
        </Text>

        <Container className="ml-4 mt-4">
          <Text className="mb-2">
            🚀 O que você pode fazer agora:
          </Text>
          <Text className="ml-4 mb-2">• <strong>Criar seu orçamento</strong> e definir para onde cada real vai</Text>
          <Text className="ml-4 mb-2">• <strong>Adicionar suas contas</strong> bancárias e cartões</Text>
          <Text className="ml-4 mb-2">• <strong>Convidar seu parceiro(a)</strong> para organizar juntos</Text>
          <Text className="ml-4 mb-2">• <strong>Registrar gastos</strong> pelo app ou por mensagem</Text>
        </Container>

        <Text className="mt-4">Pronto para começar?</Text>

        <Button
          href={dashboardUrl}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Acessar Meu Dashboard
        </Button>

        <Text className="mt-4 text-muted">
          Precisa de ajuda? Responda este email que teremos prazer em ajudar!
        </Text>
      </Layout>
    </Html>
  );
}
