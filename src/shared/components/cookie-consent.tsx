"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/button";

const COOKIE_CONSENT_KEY = "hivebudget-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleRejectOptional = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "essential-only");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80 p-4 shadow-lg">
      <div className="container mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between max-w-4xl">
        <p className="text-sm text-muted-foreground">
          Utilizamos cookies essenciais para o funcionamento do site e cookies opcionais para
          analytics e melhorias. Ao continuar, você concorda com nossa{" "}
          <Link href="/cookie" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Política de Cookies
          </Link>
          {" "}e{" "}
          <Link href="/privacy" className="text-primary underline underline-offset-2 hover:text-primary/80">
            Política de Privacidade
          </Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleRejectOptional}>
            Apenas essenciais
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Aceitar todos
          </Button>
        </div>
      </div>
    </div>
  );
}
