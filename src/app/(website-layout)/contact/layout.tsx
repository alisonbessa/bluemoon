import { Metadata } from "next";
import { appConfig } from "@/shared/lib/config";

export const metadata: Metadata = {
  title: "Fale Conosco",
  description: `Entre em contato com o ${appConfig.projectName}. Envie sua mensagem e responderemos em até 24 horas.`,
  openGraph: {
    title: `Fale Conosco | ${appConfig.projectName}`,
    description: `Entre em contato com o ${appConfig.projectName}. Envie sua mensagem e responderemos em até 24 horas.`,
    type: "website",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/contact`,
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
