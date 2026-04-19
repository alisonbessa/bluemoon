import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import Layout from "./components/Layout";
import { appConfig } from "@/shared/lib/config";

interface RoadmapStatusUpdateProps {
  userName: string;
  itemTitle: string;
  newStatusLabel: string;
  newStatusDescription: string;
  itemUrl: string;
  adminNotes?: string | null;
}

export default function RoadmapStatusUpdate({
  userName,
  itemTitle,
  newStatusLabel,
  newStatusDescription,
  itemUrl,
  adminNotes,
}: RoadmapStatusUpdateProps) {
  return (
    <Html>
      <Layout previewText={`Sua sugestão está ${newStatusLabel.toLowerCase()}`}>
        <Text>Olá, {userName}!</Text>

        <Text>
          Temos novidade sobre a sugestão que você enviou no Laboratório Beta do{" "}
          {appConfig.projectName}:
        </Text>

        <Text>
          <strong>“{itemTitle}”</strong>
        </Text>

        <Text>
          Novo status: <strong>{newStatusLabel}</strong>
          <br />
          <span style={{ color: "#6b7280" }}>{newStatusDescription}</span>
        </Text>

        {adminNotes ? (
          <Text
            style={{
              borderLeft: "3px solid #22c55e",
              paddingLeft: "12px",
              background: "#f0fdf4",
              padding: "12px",
              borderRadius: "4px",
            }}
          >
            <strong>Nota da equipe:</strong>
            <br />
            {adminNotes}
          </Text>
        ) : null}

        <Button
          href={itemUrl}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Ver detalhes
        </Button>

        <Text className="mt-4 text-muted">
          Obrigado por ajudar a construir o {appConfig.projectName}!
        </Text>
      </Layout>
    </Html>
  );
}
