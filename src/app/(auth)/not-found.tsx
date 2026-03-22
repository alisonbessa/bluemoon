import { NotFoundPage } from "@/shared/not-found-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página não encontrada",
};

export default function AuthNotFound() {
  return (
    <NotFoundPage
      title="Página não encontrada"
      description="A página de autenticação que você está procurando não existe."
      homeHref="/"
      homeLinkText="Voltar ao início"
    />
  );
}
