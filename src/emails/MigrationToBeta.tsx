import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Container } from "@react-email/container";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface MigrationToBetaProps {
  userName: string;
  dashboardUrl: string;
}

export default function MigrationToBeta({
  userName,
  dashboardUrl,
}: MigrationToBetaProps) {
  return (
    <Html>
      <Layout
        previewText={`Novidades sobre sua conta no ${appConfig.projectName}`}
      >
        <Text>
          Olá, {userName}!
        </Text>

        <Text>
          Antes de tudo, obrigado por ter se interessado pelo{" "}
          {appConfig.projectName}! Ter você por aqui desde cedo
          significa muito para a gente.
        </Text>

        <Text>
          Temos uma novidade: decidimos entrar em fase beta para
          construir a plataforma junto com quem realmente usa. Por isso,{" "}
          <strong>seu plano foi temporariamente cancelado</strong> e sua
          conta foi convertida para o programa beta.
        </Text>

        <Text>
          Mas calma, isso é uma coisa boa:
        </Text>

        <Container className="ml-4 mt-2">
          <Text className="ml-4 mb-2">
            <strong>Continue usando sem custos.</strong> Seu acesso
            continua completo e gratuito enquanto estivermos em beta.
            Nenhuma cobrança será feita.
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Seus dados estão seguros.</strong> Nada foi alterado
            no seu orçamento, transações ou configurações.
          </Text>
          <Text className="ml-4 mb-2">
            <strong>Desconto exclusivo de lançamento</strong> garantido
            quando sairmos do beta.
          </Text>
        </Container>

        <Text className="mt-4">
          E por falar em construir junto: queremos ouvir você! O que
          espera da plataforma? O que faria você indicar o{" "}
          {appConfig.projectName} para um amigo? Responda este email com
          suas expectativas, ideias ou qualquer pensamento. Cada
          mensagem sua ajuda a moldar o produto.
        </Text>

        <Button
          href={dashboardUrl}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Continuar Usando
        </Button>

        <Text className="mt-4 text-muted">
          Encontrou um bug ou tem uma sugestão? Use o botão de feedback
          dentro do app ou responda este email diretamente.
        </Text>
      </Layout>
    </Html>
  );
}
