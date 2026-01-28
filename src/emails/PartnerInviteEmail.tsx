import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface PartnerInviteEmailProps {
  inviterName: string;
  budgetName: string;
  inviteUrl: string;
  expiresAt: Date;
}

export default function PartnerInviteEmail({
  inviterName,
  budgetName,
  inviteUrl,
  expiresAt,
}: PartnerInviteEmailProps) {
  const formattedDate = expiresAt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <Layout previewText={`${inviterName} convidou você para gerenciar finanças juntos!`}>
      <Text className="text-foreground text-[16px] leading-[24px]">
        Olá! 👋
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        <strong>{inviterName}</strong> está te convidando para gerenciar as finanças
        juntos no {appConfig.projectName}!
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[24px] m-0">
          Você foi convidado(a) para participar do orçamento{" "}
          <strong>&ldquo;{budgetName}&rdquo;</strong>.
        </Text>
        <Text className="text-muted text-[12px] leading-[20px] m-0 mt-2">
          Esse convite expira em {formattedDate}.
        </Text>
      </Section>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Com o {appConfig.projectName}, vocês podem:
      </Text>

      <Text className="text-foreground text-[14px] leading-[20px] ml-4">
        ✓ Acompanhar todas as despesas em um só lugar<br />
        ✓ Definir metas financeiras juntos<br />
        ✓ Planejar o orçamento mensal em equipe<br />
        ✓ Ter visibilidade total das finanças do casal
      </Text>

      <Button
        href={inviteUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Aceitar Convite
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Se você não conhece {inviterName} ou recebeu este email por engano, pode
        ignorá-lo com segurança.
      </Text>
    </Layout>
  );
}
