"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useCurrentUser } from "@/shared/hooks/use-current-user";
import { appConfig } from "@/shared/lib/config";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, isLoading, mutate: mutateUser } = useCurrentUser();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If user already has a name, bounce them away — they shouldn't be here.
  useEffect(() => {
    if (isLoading) return;
    if (user?.name || user?.displayName) {
      router.replace("/app");
    }
  }, [isLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      toast.error("Por favor, informe seu nome");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/app/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          displayName: trimmed.slice(0, 50),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao salvar nome");
      }
      await mutateUser();
      await mutate("/api/app/me");
      router.push("/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="cartoon-panel-strong w-full max-w-md space-y-6 rounded-cartoon border bg-card p-6 sm:p-8"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Como devemos te chamar?
          </h1>
          <p className="text-sm text-muted-foreground">
            Bem-vindo ao {appConfig.projectName}. Nos diga seu nome para
            personalizarmos sua experiência.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Seu nome</Label>
          <Input
            id="name"
            autoFocus
            autoComplete="name"
            maxLength={100}
            placeholder="Ex: Maria Silva"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Salvando..." : "Continuar"}
        </Button>
      </form>
    </div>
  );
}
