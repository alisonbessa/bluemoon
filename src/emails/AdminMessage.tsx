import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface AdminMessageEmailProps {
  userName?: string | null;
  subject: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

export default function AdminMessage({
  userName,
  subject,
  body,
  ctaText,
  ctaUrl,
}: AdminMessageEmailProps) {
  return (
    <Html>
      <Layout previewText={subject}>
        <Text>
          {userName ? `Ola, ${userName}! 👋` : "Ola! 👋"}
        </Text>

        {body.split("\n").map((line, i) => (
          <Text key={i}>{line}</Text>
        ))}

        {ctaText && ctaUrl && (
          <Button
            href={ctaUrl}
            className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
          >
            {ctaText}
          </Button>
        )}

        <Text className="mt-4 text-muted">
          -- Equipe {appConfig.projectName}
        </Text>
      </Layout>
    </Html>
  );
}
