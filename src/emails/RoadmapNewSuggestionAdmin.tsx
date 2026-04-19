import * as React from "react";
import { Button } from "@react-email/button";
import { Html } from "@react-email/html";
import { Text } from "@react-email/text";
import Layout from "./components/Layout";

interface RoadmapNewSuggestionAdminProps {
  title: string;
  description: string;
  authorName: string | null;
  authorEmail: string | null;
  adminUrl: string;
}

export default function RoadmapNewSuggestionAdmin({
  title,
  description,
  authorName,
  authorEmail,
  adminUrl,
}: RoadmapNewSuggestionAdminProps) {
  return (
    <Html>
      <Layout previewText={`Nova sugestão no Laboratório Beta: ${title}`}>
        <Text>
          <strong>Nova sugestão no Laboratório Beta</strong>
        </Text>

        <Text>
          <strong>Título:</strong> {title}
          <br />
          <strong>Autor:</strong>{" "}
          {authorEmail ? `${authorName ?? "—"} (${authorEmail})` : "Anônimo"}
        </Text>

        <Text
          style={{
            borderLeft: "3px solid #e5e7eb",
            paddingLeft: "12px",
            color: "#374151",
            whiteSpace: "pre-wrap",
          }}
        >
          {description}
        </Text>

        <Button
          href={adminUrl}
          className="bg-primary text-primary-foreground rounded-md py-2 px-4 mt-4"
        >
          Abrir no super-admin
        </Button>
      </Layout>
    </Html>
  );
}
