import * as React from "react";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Button } from "@react-email/button";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface WaitlistConfirmationProps {
  userName?: string | null;
  siteUrl: string;
}

export default function WaitlistConfirmation({
  userName,
  siteUrl,
}: WaitlistConfirmationProps) {
  return (
    <Html>
      <Layout
        previewText={`Você está na lista de espera do ${appConfig.projectName}!`}
      >
        <Text>
          {userName ? `Olá, ${userName}!` : "Olá!"}
        </Text>

        <Text>
          Obrigado por se inscrever na lista de espera do{" "}
          {appConfig.projectName}! Recebemos sua inscrição e você será uma
          das primeiras pessoas a saber quando a plataforma estiver
          disponível.
        </Text>

        <Text>
          Estamos trabalhando para criar a melhor ferramenta de controle
          financeiro para casais e famílias brasileiras. Cada pessoa na
          lista de espera nos motiva a entregar algo que realmente faz
          diferença.
        </Text>

        <Text>
          Enquanto isso, nos siga nas redes para acompanhar as novidades:
        </Text>

        <Button
          href={appConfig.social.instagram || siteUrl}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-2"
        >
          Seguir no Instagram
        </Button>

        <Text className="mt-4 text-muted">
          Fique de olho no seu email. Avisaremos assim que tivermos
          novidades!
        </Text>
      </Layout>
    </Html>
  );
}
