"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { appConfig } from "@/shared/lib/config";

interface PlanPricing {
  price: number | null;
  priceFormatted: string | null;
  monthlyEquivalent?: string | null;
}

interface Plan {
  id: string;
  name: string;
  codename: string;
  pricing: {
    monthly: PlanPricing | null;
    yearly: PlanPricing | null;
  };
}

const SOLO_FEATURES = [
  "1 pessoa",
  "Registro por mensagem (texto, foto, áudio)",
  "Metas ilimitadas",
  "Suporte por email",
];

const DUO_FEATURES = [
  { text: "Tudo do Solo, pra vocês dois", strong: "Tudo do Solo" },
  { text: "Orçamento compartilhado" },
  { text: "Acerto do mês automático" },
  { text: "Privacidade configurável" },
  { text: "Suporte prioritário" },
];

export function CartoonPricing() {
  const isWaitlist = appConfig.waitlistMode;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/app/plans")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setPlans(data.plans ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const solo = plans.find((p) => p.codename === "solo");
  const duo = plans.find((p) => p.codename === "duo");

  return (
    <section id="pricing" className="px-6 py-22 md:py-28">
      <div className="mx-auto max-w-(--breakpoint-lg)">
        <div className="text-center">
          <p className="font-hand mb-1 inline-block -rotate-1 text-2xl font-bold text-primary">
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
            <PlanPrice
              priceCents={solo?.pricing.monthly?.price ?? null}
              suffix="/mês"
              loading={loading}
            />
            <p className="text-[13.5px] text-muted-foreground">
              Pra quem ainda tá organizando sozinho.
            </p>
            <ul className="flex flex-1 flex-col gap-2.5 text-[14.5px]">
              {SOLO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckPill />
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
          <article className="cartoon-panel relative flex flex-col gap-5 overflow-visible rounded-[22px] bg-linear-to-b from-[oklch(from_var(--brand-violet-300)_l_c_h/0.18)] to-card p-8 shadow-cartoon-lg">
            <span className="cartoon-chrome absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground">
              ✨ Recomendado pra casais
            </span>
            <p className="text-[13px] font-extrabold uppercase tracking-wider text-(--brand-violet-700)">
              Duo
            </p>
            <PlanPrice
              priceCents={duo?.pricing.monthly?.price ?? null}
              suffix="/mês · pelos dois"
              loading={loading}
            />
            <p className="text-[13.5px] font-semibold text-(--brand-violet-700)">
              🐝 Plano do casal. O parceiro(a) entra grátis.
            </p>
            <ul className="flex flex-1 flex-col gap-2.5 text-[14.5px]">
              {DUO_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5">
                  <CheckPill />
                  <span>
                    {f.strong ? (
                      <>
                        <b className="text-foreground">{f.strong}</b>
                        {f.text.replace(f.strong, "")}
                      </>
                    ) : (
                      f.text
                    )}
                  </span>
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

function CheckPill() {
  return (
    <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[oklch(from_var(--success)_l_c_h/0.12)] text-(--success)">
      <Check className="size-3" strokeWidth={3.5} />
    </span>
  );
}

function PlanPrice({
  priceCents,
  suffix,
  loading,
}: {
  priceCents: number | null;
  suffix: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Carregando preço…</span>
      </p>
    );
  }

  if (priceCents == null) {
    return (
      <p className="text-sm text-muted-foreground">Preço indisponível no momento.</p>
    );
  }

  const reais = Math.floor(priceCents / 100);
  const cents = priceCents % 100;

  return (
    <p className="font-extrabold leading-none">
      <span className="align-top text-xl font-semibold text-muted-foreground">R$</span>
      <span className="text-[44px] tracking-tight">{reais}</span>
      {cents > 0 && (
        <span className="align-top text-xl font-semibold text-muted-foreground">
          ,{cents.toString().padStart(2, "0")}
        </span>
      )}
      <span className="text-[15px] font-medium text-muted-foreground"> {suffix}</span>
    </p>
  );
}
