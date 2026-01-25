import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SignUpEmailProps {
  name: string;
  url: string;
  expiresAt: Date;
}

export default function SignUpEmail({
  name,
  url,
  expiresAt = new Date(Date.now() + 30 * 60 * 1000),
}: SignUpEmailProps) {
  return (
    <Html>
      <Layout previewText={`Complete seu cadastro no ${appConfig.projectName} 🚀`}>
        <Text>Olá, {name}! 👋</Text>

        <Text>
          Bem-vindo ao {appConfig.projectName}! Clique no botão abaixo para definir sua
          senha e finalizar seu cadastro.
        </Text>

        <Button
          href={url}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Definir Minha Senha
        </Button>

        <Text className="text-muted text-[14px] mt-4">
          Este link expira{" "}
          {formatDistanceToNow(new Date(expiresAt), { addSuffix: true, locale: ptBR })}.
          Se você não solicitou este email, pode ignorá-lo.
        </Text>
      </Layout>
    </Html>
  );
}
