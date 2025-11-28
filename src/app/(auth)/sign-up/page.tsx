import { Metadata } from "next"
import Link from "next/link"
import { appConfig } from "@/lib/config"
import { SignUpForm } from "@/components/auth/signup-form"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata: Metadata = {
  title: "Cadastrar",
  description: `Crie sua conta no ${appConfig.projectName}`,
}

export default function SignUpPage() {
  const showPasswordAuth = appConfig.auth?.enablePasswordAuth;

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

      {showPasswordAuth ? <SignUpForm /> : <AuthForm />}

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