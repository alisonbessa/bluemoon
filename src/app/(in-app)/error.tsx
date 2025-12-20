"use client";

import { ErrorBoundary } from "@/components/error-boundary";

export default function InAppError({
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
      title="Erro no aplicativo"
      description="Ocorreu um erro inesperado. Por favor, tente novamente ou volte para a página inicial."
    />
  );
}
