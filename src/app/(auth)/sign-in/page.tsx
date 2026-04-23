import { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/shared/lib/config";
import { AuthForm } from "@/shared/auth/auth-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: `Entre na sua conta ${appConfig.projectName}`,
};

export default function SignInPage() {
  // Stale JWT cleanup is handled client-side by AppShell (calls signOut when
  // /api/app/me reports the user no longer exists), so this page stays pure.
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

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ao entrar, você concorda com nossos{" "}
        <Link href="/terms" className="text-primary hover:underline">
          Termos de Uso
        </Link>{" "}
        e nossa{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Política de Privacidade
        </Link>.
      </p>

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
