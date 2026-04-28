import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";

export function CartoonFinalCTA() {
  return (
    <section className="bg-gradient-to-b from-card to-accent/40 px-6 py-22 md:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-[28px] border-2 border-[var(--ink)] bg-gradient-to-br from-[var(--brand-violet-500)] to-[oklch(0.55_0.18_310)] p-12 text-center text-primary-foreground shadow-[var(--shadow-cartoon-lg)] md:p-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10% 20%, oklch(from var(--brand-honey-300) l c h / 0.35) 0, transparent 35%), radial-gradient(circle at 90% 80%, oklch(from var(--brand-honey-500) l c h / 0.25) 0, transparent 45%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[42px]">
              Organizem o dinheiro{" "}
              <em className="font-hand not-italic font-bold text-secondary text-[1.15em]">
                juntos
              </em>
              .<br />
              Discutam sobre outra coisa.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-snug text-primary-foreground/90">
              {appConfig.waitlistMode
                ? "O beta tá aberto e de graça. Cinco minutos pra configurar, um mês pra sentir a diferença."
                : "Cinco minutos pra configurar, um mês pra sentir a diferença. Comecem juntos hoje."}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link href={appConfig.waitlistMode ? "/beta" : "#pricing"}>
                  Comecem grátis agora
                  <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                asChild
              >
                <Link href="#como-funciona">Ver como funciona</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
