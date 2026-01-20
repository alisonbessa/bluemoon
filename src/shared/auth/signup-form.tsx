"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signUpRequestSchema, type SignUpRequestInput } from "@/shared/lib/validations/auth.schema";

export function SignUpForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpRequestInput>({
    resolver: zodResolver(signUpRequestSchema),
  });

  const onSubmit = async (data: SignUpRequestInput) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Falha ao enviar email de cadastro");
        return;
      }

      toast.success("Verifique seu email para completar a configuração da conta!");
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Algo deu errado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            placeholder="João Silva"
            type="text"
            autoComplete="name"
            disabled={isLoading}
            {...register("name")}
            className="w-full py-6"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Endereço de email</Label>
          <Input
            id="email"
            placeholder="seu@email.com"
            type="email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect="off"
            disabled={isLoading}
            {...register("email")}
            className="w-full py-6"
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isLoading} className="w-full py-6">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Continuar
        </Button>
      </form>
    </div>
  );
}

