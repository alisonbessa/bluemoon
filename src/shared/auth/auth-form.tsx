"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { appConfig } from "@/shared/lib/config";
import { loginSchema, type LoginInput } from "@/shared/lib/validations/auth.schema";
import Link from "next/link";

interface AuthFormProps extends React.HTMLAttributes<HTMLDivElement> {
  callbackUrl?: string;
}

export function AuthForm({ className, callbackUrl, ...props }: AuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState<string>("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const showPasswordAuth = appConfig.auth?.enablePasswordAuth;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });


  const handleImpersonation = React.useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const result = await signIn("impersonation", {
        signedToken: token,
        redirect: false,
        callbackUrl: callbackUrl || searchParams?.get("callbackUrl") || "/app",
      });

      if (result?.error) {
        toast.error("Falha ao personificar usuário");
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error("Impersonation error:", error);
      toast.error("Falha ao personificar usuário");
    } finally {
      setIsLoading(false);
    }
  }, [callbackUrl, searchParams, router]);

  
  React.useEffect(() => {
    const impersonateToken = searchParams?.get("impersonateToken");
    if (impersonateToken) {
      handleImpersonation(impersonateToken);
    }
  }, [searchParams, handleImpersonation]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", {
        callbackUrl: callbackUrl || searchParams?.get("callbackUrl") || "/app",
      });
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Falha ao continuar com Google");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSignIn = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: callbackUrl || searchParams?.get("callbackUrl") || "/app",
      });

      if (result?.error) {
        toast.error("Email ou senha inválidos");
      } else if (result?.url) {
        router.push(result.url);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Algo deu errado");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: callbackUrl || searchParams?.get("callbackUrl") || "/app",
      });

      if (result?.error) {
        toast.error("Falha ao enviar email de login");
      } else {
        toast.success("Verifique seu email para o link de login");
        setEmail("");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Algo deu errado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Button
        variant="outline"
        type="button"
        disabled={isLoading}
        onClick={handleGoogleSignIn}
        className="w-full py-6"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        Continuar com Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Ou continue com {showPasswordAuth ? "senha" : "email"}
          </span>
        </div>
      </div>

      {showPasswordAuth ? (
        <form onSubmit={handleSubmit(handlePasswordSignIn)} className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/reset-password"
                className="text-xs text-primary hover:text-primary/90 underline underline-offset-4"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="password"
              placeholder="Digite sua senha"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              {...register("password")}
              className="w-full py-6"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full py-6">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </form>
      ) : (
        <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-6"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full py-6">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continuar com Email
          </Button>
        </form>
      )}
    </div>
  );
}
