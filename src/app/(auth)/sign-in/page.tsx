import { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/lib/config";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: `Entre na sua conta ${appConfig.projectName}`,
};

export default function SignInPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-muted-foreground">
          Entre na sua conta para continuar
        </p>
      </div>

      <AuthForm />

      <div className="mt-6 text-center">
        <Link
          href="/sign-up"
          className="text-sm text-primary hover:text-primary/90 underline underline-offset-4"
        >
          Não tem uma conta? Cadastre-se
        </Link>
      </div>
    </>
  );
}
