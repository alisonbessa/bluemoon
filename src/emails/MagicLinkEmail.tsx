import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MagicLinkEmailProps {
  url: string;
  expiresAt: Date;
}

export default function MagicLinkEmail({
  url,
  expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000),
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Layout previewText={`Entrar no ${appConfig.projectName} 🔐`}>
        <Text>Olá! 👋</Text>

        <Text>
          Clique no botão abaixo para acessar sua conta no {appConfig.projectName}.
        </Text>

        <Button
          href={url}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Acessar {appConfig.projectName}
        </Button>

        <Text className="text-muted text-[14px] mt-4">
          Este link de acesso expira{" "}
          {formatDistanceToNow(new Date(expiresAt), { addSuffix: true, locale: ptBR })}.
          Se você não solicitou este email, pode ignorá-lo.
        </Text>
      </Layout>
    </Html>
  );
}
