import { Metadata } from "next"
import Link from "next/link"
import { appConfig } from "@/shared/lib/config"
import { SignUpForm } from "@/shared/auth/signup-form"
import { AuthForm } from "@/shared/auth/auth-form"

export const metadata: Metadata = {
  title: "Cadastrar",
  description: `Crie sua conta no ${appConfig.projectName}`,
}

interface SignUpPageProps {
  searchParams: Promise<{ plan?: string; billing?: string }>;
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const showPasswordAuth = appConfig.auth?.enablePasswordAuth;
  const params = await searchParams;

  // Build callback URL with plan parameters if present
  let callbackUrl = "/app";
  if (params.plan && params.billing) {
    callbackUrl = `/app/choose-plan?plan=${params.plan}&billing=${params.billing}`;
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Criar uma conta
        </h1>
        <p className="text-sm text-muted-foreground">
          Comece a usar o {appConfig.projectName} hoje
        </p>
      </div>

      {showPasswordAuth ? <SignUpForm /> : <AuthForm callbackUrl={callbackUrl} />}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Ao criar sua conta, você concorda com nossos{" "}
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
          href="/sign-in"
          className="text-sm text-primary hover:text-primary/90 underline underline-offset-4"
        >
          Já tem uma conta? Entre
        </Link>
      </div>
    </>
  )
} 