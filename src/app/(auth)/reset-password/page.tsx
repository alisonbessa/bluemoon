import { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/lib/config";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir Senha",
  description: `Redefina sua senha do ${appConfig.projectName}`,
};

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Redefinir Senha
        </h1>
        <p className="text-sm text-muted-foreground">
          Digite seu endereço de email e enviaremos um link para redefinir sua senha
        </p>
      </div>

      <ResetPasswordForm />

      <div className="mt-6 text-center">
        <Link
          href="/sign-in"
          className="text-sm text-primary hover:text-primary/90 underline underline-offset-4"
        >
          Voltar para Entrar
        </Link>
      </div>
    </>
  );
}

