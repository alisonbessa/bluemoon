import * as React from "react";
import { Button, Text, Hr, Section } from "@react-email/components";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

const PRIVACY_MODE_LABELS: Record<string, string> = {
  visible: "Tudo visível",
  unified: "Unificado",
  private: "Completamente privado",
};

interface PrivacyChangeRequestEmailProps {
  requesterName: string;
  budgetName: string;
  currentMode: string;
  requestedMode: string;
  confirmUrl: string;
  rejectUrl: string;
}

export default function PrivacyChangeRequestEmail({
  requesterName,
  budgetName,
  currentMode,
  requestedMode,
  confirmUrl,
  rejectUrl,
}: PrivacyChangeRequestEmailProps) {
  return (
    <Layout previewText={`${requesterName} quer alterar a privacidade do orçamento`}>
      <Text className="text-foreground text-[16px] leading-[24px]">
        Oi! 👋
      </Text>

      <Text className="text-foreground text-[14px] leading-[24px]">
        <strong>{requesterName}</strong> está solicitando uma mudança na
        privacidade do orçamento{" "}
        <strong>&ldquo;{budgetName}&rdquo;</strong>.
      </Text>

      <Section className="bg-primary/10 rounded-lg p-4 my-4">
        <Text className="text-foreground text-[14px] leading-[24px] m-0">
          <strong>Modo atual:</strong> {PRIVACY_MODE_LABELS[currentMode] || currentMode}
        </Text>
        <Text className="text-foreground text-[14px] leading-[24px] m-0 mt-1">
          <strong>Modo solicitado:</strong> {PRIVACY_MODE_LABELS[requestedMode] || requestedMode}
        </Text>
      </Section>

      <Text className="text-foreground text-[14px] leading-[24px]">
        O que cada modo significa:
      </Text>

      <Text className="text-foreground text-[14px] leading-[20px] ml-4">
        <strong>Tudo visível:</strong> Ambos veem tudo um do outro, incluindo transações individuais<br />
        <strong>Unificado:</strong> Tudo junto como plano solo — só os detalhes das compras individuais ficam ocultos<br />
        <strong>Privado:</strong> Contas, metas e transações pessoais ficam completamente ocultos
      </Text>

      <Section className="mt-6 text-center">
        <Button
          href={confirmUrl}
          className="bg-primary text-primary-foreground rounded-md py-3 px-6 font-semibold"
        >
          Aprovar mudança
        </Button>
      </Section>

      <Section className="mt-3 text-center">
        <Button
          href={rejectUrl}
          className="bg-muted text-muted-foreground rounded-md py-3 px-6 font-semibold"
        >
          Rejeitar
        </Button>
      </Section>

      <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />

      <Text className="text-muted text-[12px] leading-[20px]">
        Esta mudança só será aplicada se ambos os membros concordarem.
        Se você não solicitou esta alteração, pode rejeitá-la com segurança.
      </Text>
    </Layout>
  );
}
