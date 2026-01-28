import { appConfig } from "@/shared/lib/config";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

interface LayoutProps {
  children: React.ReactNode;
  previewText?: string;
}

const baseUrl =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_APP_URL
    : "http://localhost:3000";

export const Layout = ({ children, previewText }: LayoutProps) => {
  return (
    <Html>
      <Head />
      <Preview>{previewText || ""}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: "#22c55e", // Green - HiveBudget brand color
                background: "#f9fafb",
                foreground: "#111827",
                border: "#e5e7eb",
                muted: "#6b7280",
                ["primary-foreground"]: "#ffffff",
              },
            },
          },
        }}
      >
        <Body className="bg-background my-auto mx-auto font-sans">
          <Container className="border border-solid border-border rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
            <div className="flex justify-center items-center">
              <Img
                src={`${baseUrl}/assets/logo.png`}
                width="20"
                height="20"
                alt={`${appConfig.projectName} Logo`}
                className="my-0 mx-0"
              />
              <Text className="text-foreground ">{appConfig.projectName}</Text>
            </div>
            {children}
            <Hr className="border border-solid border-border my-[26px] mx-0 w-full" />
            <Img
              src={`${baseUrl}/assets/logo.png`}
              width="20"
              height="20"
              alt={`${appConfig.projectName} Logo`}
              className="my-0 mx-0"
            />
            <Text className="text-muted text-[11px] leading-[24px]">
              Este email foi enviado pelo {appConfig.projectName}.
              <br />
              Endereço: {appConfig.legal.address.street},{" "}
              {appConfig.legal.address.city}, {appConfig.legal.address.state},{" "}
              {appConfig.legal.address.postalCode},{" "}
              {appConfig.legal.address.country}
              <br />
              Dúvidas? Entre em contato pelo{" "}
              <Link
                className="text-primary underline"
                href={`mailto:${appConfig.legal.email}`}
              >
                {appConfig.legal.email}
              </Link>{" "}
              ou{" "}
              <Link className="text-primary underline" href={`${baseUrl}/contact`}>
                Fale Conosco
              </Link>
              .
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Layout;
