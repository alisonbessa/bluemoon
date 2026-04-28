import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";

const SOLO_FEATURES = [
  "1 pessoa",
  "Registro por mensagem (texto, foto, áudio)",
  "Metas ilimitadas",
  "Suporte por email",
];

const DUO_FEATURES = [
  "Tudo do Solo, pra vocês dois",
  "Orçamento compartilhado",
  "Acerto do mês automático",
  "Privacidade configurável",
  "Suporte prioritário",
];

export function CartoonPricing() {
  const isWaitlist = appConfig.waitlistMode;
  return (
    <section id="pricing" className="px-6 py-22 md:py-28">
      <div className="mx-auto max-w-(--breakpoint-lg)">
        <div className="text-center">
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary">
            Preços honestos
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-[42px] md:leading-[1.1]">
            Um plano simples —{" "}
            <em className="font-hand text-[1.15em] not-italic font-bold leading-none text-primary">
              o parceiro entra de graça
            </em>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Sem pegadinha, sem upgrade escondido. Só quem cria a conta paga.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl items-stretch gap-6 md:grid-cols-2">
          {/* Solo */}
          <article className="cartoon-panel relative flex flex-col gap-5 rounded-[22px] bg-card p-8">
            <p className="text-[13px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Solo
            </p>
            <p className="font-extrabold leading-none">
              <span className="align-top text-xl font-semibold text-muted-foreground">R$</span>
              <span className="text-[44px] tracking-tight">19</span>
              <span className="text-[15px] font-medium text-muted-foreground"> /mês</span>
            </p>
            <p className="text-[13.5px] text-muted-foreground">
              Pra quem ainda tá organizando sozinho.
            </p>
            <ul className="flex flex-1 flex-col gap-2.5 text-[14.5px]">
              {SOLO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[oklch(from_var(--success)_l_c_h/0.12)] text-[var(--success)]">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" asChild>
              <Link href={isWaitlist ? "/beta" : "/sign-up?plan=solo"}>
                Começar solo
              </Link>
            </Button>
          </article>

          {/* Duo */}
          <article className="cartoon-panel relative flex flex-col gap-5 overflow-visible rounded-[22px] bg-gradient-to-b from-[oklch(from_var(--brand-violet-300)_l_c_h/0.18)] to-card p-8 shadow-[var(--shadow-cartoon-lg)]">
            <span className="cartoon-chrome absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground">
              ✨ Recomendado pra casais
            </span>
            <p className="text-[13px] font-extrabold uppercase tracking-wider text-[var(--brand-violet-700)]">
              Duo
            </p>
            <p className="font-extrabold leading-none">
              <span className="align-top text-xl font-semibold text-muted-foreground">R$</span>
              <span className="text-[44px] tracking-tight">29</span>
              <span className="text-[15px] font-medium text-muted-foreground">
                {" "}/mês · pelos dois
              </span>
            </p>
            <p className="text-[13.5px] font-semibold text-[var(--brand-violet-700)]">
              🐝 Plano do casal. O parceiro(a) entra grátis.
            </p>
            <ul className="flex flex-1 flex-col gap-2.5 text-[14.5px]">
              {DUO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[oklch(from_var(--success)_l_c_h/0.12)] text-[var(--success)]">
                    <Check className="size-3" strokeWidth={3.5} />
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: highlight(f) }} />
                </li>
              ))}
            </ul>
            <Button asChild>
              <Link href={isWaitlist ? "/beta" : "/sign-up?plan=duo"}>
                Comecem juntos grátis
                <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}

function highlight(text: string) {
  return text.replace(
    /Tudo do Solo/,
    '<b class="text-foreground">Tudo do Solo</b>'
  );
}
