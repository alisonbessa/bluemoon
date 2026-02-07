"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setPasswordSchema, type SetPasswordInput } from "@/shared/lib/validations/auth.schema";
import { appConfig } from "@/shared/lib/config";

export default function SetPasswordPage() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get("token");

  React.useEffect(() => {
    if (!token) {
      setTokenError("Token inválido ou ausente. Solicite um novo link de cadastro.");
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onSubmit = async (data: SetPasswordInput) => {
    if (!token) {
      toast.error("Token inválido");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Falha ao criar conta");
        return;
      }

      toast.success("Conta criada com sucesso! Faça login.");
      router.push("/sign-in");
    } catch (error) {
      console.error("Set password error:", error);
      toast.error("Algo deu errado");
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="flex flex-col gap-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Link Inválido
          </h1>
          <p className="text-sm text-muted-foreground">
            {tokenError}
          </p>
        </div>
        <Button onClick={() => router.push("/sign-up")} className="w-full py-6">
          Ir para Cadastro
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Defina sua Senha
        </h1>
        <p className="text-sm text-muted-foreground">
          Crie uma senha segura para sua conta {appConfig.projectName}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            placeholder="Digite sua senha"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            {...register("password")}
            className="w-full py-6"
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirmar Senha</Label>
          <Input
            id="confirmPassword"
            placeholder="Confirme sua senha"
            type="password"
            autoComplete="new-password"
            disabled={isLoading}
            {...register("confirmPassword")}
            className="w-full py-6"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full py-6">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Criar Conta
        </Button>
      </form>
    </>
  );
}

