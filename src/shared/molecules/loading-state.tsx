"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface LoadingStateProps {
  /** Tamanho do spinner */
  size?: "sm" | "md" | "lg";
  /** Texto opcional abaixo do spinner */
  text?: string;
  /** Se deve ocupar a altura inteira da viewport */
  fullHeight?: boolean;
  /** Altura customizada (ex: "60vh", "200px") */
  height?: string;
  /** Classes CSS adicionais */
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

/**
 * LoadingState - Molecule para estados de carregamento
 *
 * Fornece uma interface consistente para exibir estados de loading
 * em diferentes contextos (página inteira, seções, cards, etc.)
 *
 * @example
 * ```tsx
 * // Loading de página
 * if (isLoading) return <LoadingState fullHeight />;
 *
 * // Loading de seção
 * if (isLoading) return <LoadingState height="200px" text="Carregando dados..." />;
 *
 * // Loading pequeno inline
 * {isLoading && <LoadingState size="sm" />}
 * ```
 */
export function LoadingState({
  size = "md",
  text,
  fullHeight = false,
  height,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        fullHeight && "h-[60vh]",
        className
      )}
      style={height ? { height } : undefined}
    >
      <Loader2
        className={cn(
          "animate-spin text-muted-foreground",
          sizeClasses[size]
        )}
      />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
}
