"use client";

import { Button } from "@/shared/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface NotFoundPageProps {
  title?: string;
  description?: string;
  homeHref?: string;
  homeLinkText?: string;
  showBackButton?: boolean;
}

export function NotFoundPage({
  title = "Página não encontrada",
  description = "A página que você está procurando não existe ou foi movida.",
  homeHref = "/",
  homeLinkText = "Voltar ao início",
  showBackButton = true,
}: NotFoundPageProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-muted-foreground max-w-md">{description}</p>
        </div>
      </div>

      <div className="flex gap-3">
        {showBackButton && (
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        )}

        <Button variant="default" asChild>
          <Link href={homeHref}>
            <Home className="mr-2 h-4 w-4" />
            {homeLinkText}
          </Link>
        </Button>
      </div>
    </div>
  );
}
