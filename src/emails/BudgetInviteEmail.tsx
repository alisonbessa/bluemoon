import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";
import { Hr } from "@react-email/hr";
import Layout from "./components/Layout";
import { appConfig } from "@/lib/config";

interface BudgetInviteEmailProps {
  inviterName: string;
  budgetName: string;
  inviteUrl: string;
  expiresInDays?: number;
}

export default function BudgetInviteEmail({
  inviterName = "Alguém",
  budgetName = "Orçamento Familiar",
  inviteUrl = "https://example.com/invite/abc123",
  expiresInDays = 7,
}: BudgetInviteEmailProps) {
  return (
    <Html>
      <Layout previewText={`${inviterName} te convidou para compartilhar um orçamento`}>
        <Text className="text-foreground text-[16px]">
          Olá! 👋
        </Text>

        <Text className="text-foreground text-[16px]">
          <strong>{inviterName}</strong> te convidou para compartilhar o orçamento{" "}
          <strong>&quot;{budgetName}&quot;</strong> no {appConfig.projectName}.
        </Text>

        <Section className="bg-muted/30 rounded-lg p-4 my-4">
          <Text className="text-foreground text-[14px] m-0">
            Ao aceitar, você poderá:
          </Text>
          <Text className="text-muted text-[14px] m-0 ml-4">
            • Visualizar e adicionar transações
          </Text>
          <Text className="text-muted text-[14px] m-0 ml-4">
            • Gerenciar categorias e planejamento
          </Text>
          <Text className="text-muted text-[14px] m-0 ml-4">
            • Acompanhar metas financeiras juntos
          </Text>
        </Section>

        <Button
          href={inviteUrl}
          className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 text-[14px] font-medium"
        >
          Aceitar Convite
        </Button>

        <Hr className="border border-solid border-border my-6" />

        <Text className="text-muted text-[12px]">
          Este convite expira em {expiresInDays} dias. Se você não conhece {inviterName} ou
          não esperava este convite, você pode ignorar este email com segurança.
        </Text>

        <Text className="text-muted text-[12px]">
          Se o botão não funcionar, copie e cole este link no seu navegador:
          <br />
          <span className="text-primary">{inviteUrl}</span>
        </Text>
      </Layout>
    </Html>
  );
}
