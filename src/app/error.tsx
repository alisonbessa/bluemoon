"use client";

import { ErrorBoundary } from "@/components/error-boundary";

export default function RootError({
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
      title="Erro inesperado"
      description="Ocorreu um erro inesperado no sistema. Por favor, tente novamente."
    />
  );
}
