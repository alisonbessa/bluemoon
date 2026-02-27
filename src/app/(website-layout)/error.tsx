"use client";

import { ErrorBoundary } from "@/shared/error-boundary";

export default function WebsiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      error={error}
      reset={reset}
      title="Erro na página"
      description="Ocorreu um erro inesperado. Por favor, tente novamente ou volte para a página inicial."
    />
  );
}
