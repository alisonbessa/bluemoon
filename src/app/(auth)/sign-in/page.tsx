import { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/lib/config";
import { AuthForm } from "@/components/auth/auth-form";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Entrar",
  description: `Entre na sua conta ${appConfig.projectName}`,
};

export default async function SignInPage() {
  // Check if user has a session but doesn't exist in database
  const session = await auth();
  if (session?.user?.id) {
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // If user has session but doesn't exist in DB, sign them out
    if (existingUser.length === 0) {
      await signOut({ redirect: false });
    }
  }

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
