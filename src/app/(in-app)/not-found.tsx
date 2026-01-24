import { NotFoundPage } from "@/shared/not-found-page";

export default function InAppNotFound() {
  return (
    <NotFoundPage
      title="Página não encontrada"
      description="A página que você está procurando não existe no aplicativo."
      homeHref="/app"
      homeLinkText="Voltar ao dashboard"
    />
  );
}
