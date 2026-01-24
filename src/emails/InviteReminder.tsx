import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface InviteReminderProps {
  userName: string;
  partnerEmail: string;
  budgetName: string;
  inviteUrl: string;
  expiresIn: string;
}

export default function InviteReminder({
  userName,
  partnerEmail,
  budgetName,
  inviteUrl,
  expiresIn,
}: InviteReminderProps) {
  return (
    <Layout previewText={`Seu convite ainda não foi aceito - ${appConfig.projectName}`}>
      <Text className="text-foreground text-[16px] leading-[24px]">
        Olá, {userName}!
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Notamos que o convite que você enviou para <strong>{partnerEmail}</strong>{" "}
        ainda não foi aceito.
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[24px] m-0">
          O convite para o orçamento <strong>"{budgetName}"</strong> expira em{" "}
          <strong>{expiresIn}</strong>.
        </Text>
      </Section>

      <Text className="text-foreground text-[14px] leading-[24px]">
        Quer reenviar o convite? Basta clicar no botão abaixo para copiar o link
        e enviar para seu parceiro(a).
      </Text>

      <Button
        href={inviteUrl}
        className="bg-primary text-primary-foreground rounded-md py-3 px-6 mt-4 font-semibold"
      >
        Ver Convites Pendentes
      </Button>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Dica: Verifique se o email está correto e peça para seu parceiro(a)
        verificar a caixa de spam!
      </Text>
    </Layout>
  );
}
