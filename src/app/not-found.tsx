import { NotFoundPage } from "@/shared/not-found-page";

export default function RootNotFound() {
  return (
    <NotFoundPage
      title="Página não encontrada"
      description="A página que você está procurando não existe ou foi movida."
      homeHref="/"
      homeLinkText="Voltar ao início"
    />
  );
}
