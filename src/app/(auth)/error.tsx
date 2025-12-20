"use client";

import { ErrorBoundary } from "@/components/error-boundary";

export default function AuthError({
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
      title="Erro de autenticação"
      description="Ocorreu um erro durante a autenticação. Por favor, tente novamente."
      showHomeLink={false}
    />
  );
}
