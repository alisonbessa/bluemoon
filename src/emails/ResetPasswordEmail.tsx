import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ResetPasswordEmailProps {
  url: string;
  expiresAt: Date;
}

export default function ResetPasswordEmail({
  url,
  expiresAt = new Date(Date.now() + 30 * 60 * 1000),
}: ResetPasswordEmailProps) {
  return (
    <Html>
      <Layout previewText={`Redefinir sua senha do ${appConfig.projectName} 🔐`}>
        <Text>Olá! 👋</Text>

        <Text>
          Recebemos uma solicitação para redefinir a senha da sua conta no{" "}
          {appConfig.projectName}. Clique no botão abaixo para criar uma nova senha.
        </Text>

        <Button
          href={url}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Redefinir Senha
        </Button>

        <Text className="text-muted text-[14px] mt-4">
          Este link expira{" "}
          {formatDistanceToNow(new Date(expiresAt), { addSuffix: true, locale: ptBR })}.
          Se você não solicitou este email, pode ignorá-lo com segurança.
        </Text>
      </Layout>
    </Html>
  );
}
