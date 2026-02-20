import { Metadata } from "next";
import WaitlistForm from "./waitlist-form";
import { WebPageJsonLd } from "next-seo";
import { appConfig } from "@/shared/lib/config";
import { cn } from "@/shared/lib/utils";
import { AnimatedGridPattern } from "@/shared/magicui/animated-grid-pattern";

export const metadata: Metadata = {
  title: "Lista de Espera",
  description: "Entre na lista de espera para ter acesso antecipado à nossa plataforma.",
  openGraph: {
    title: "Lista de Espera",
    description: "Entre na lista de espera para ter acesso antecipado à nossa plataforma.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/join-waitlist`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        width: 1200,
        height: 630,
        alt: "Lista de Espera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lista de Espera",
    description: "Entre na lista de espera para ter acesso antecipado à nossa plataforma.",
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/join-waitlist`,
  },
};

export default function JoinWaitlistPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden relative">
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.1}
        duration={3}
        repeatDelay={1}
        className={cn(
          "mask-[radial-gradient(500px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-30%] h-[150%] skew-y-12"
        )}
      />
      <WebPageJsonLd
        useAppDir
        id={`${process.env.NEXT_PUBLIC_APP_URL}/join-waitlist`}
        title="Lista de Espera"
        description="Entre na lista de espera para ter acesso antecipado à nossa plataforma."
        isAccessibleForFree={true}
        publisher={{
          "@type": "Organization",
          name: appConfig.projectName,
          url: process.env.NEXT_PUBLIC_APP_URL,
        }}
      />
      <div className="container max-w-md px-4 py-16 z-50">
        <div className="bg-background">
          <div className="rounded-3xl bg-muted/40 p-8 shadow-xs ring-1 ring-border/60">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-3xl font-bold">Lista de Espera</h1>
              <p className="text-muted-foreground">
                Seja um dos primeiros a experimentar nossa plataforma quando lançarmos.
              </p>
            </div>
            <WaitlistForm />
          </div>
        </div>
      </div>
    </div>
  );
}
