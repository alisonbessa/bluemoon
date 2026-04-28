import { Users, MessageCircle, Send } from "lucide-react";

const STEPS = [
  {
    n: "01",
    Icon: Users,
    title: "Convidem um ao outro",
    text: "Quem criar a conta paga. O(a) parceiro(a) entra grátis com um convite.",
  },
  {
    n: "02",
    Icon: MessageCircle,
    title: "Combinem o mês",
    text: "Quanto vai pra moradia, mercado, lazer. 10 minutos de conversa e pronto.",
  },
  {
    n: "03",
    Icon: Send,
    title: "Mandem mensagem",
    text: '"gastei 45 no ifood." A gente categoriza, soma, avisa quando o mês aperta.',
  },
];

export function CartoonHowItWorks() {
  return (
    <section
      id="como-funciona"
      className="bg-linear-to-b from-card to-background px-6 py-22 md:py-28"
    >
      <div className="mx-auto max-w-(--breakpoint-lg)">
        <div className="text-center">
          <p className="font-hand mb-1 inline-block -rotate-1 text-2xl font-bold text-primary">
            Como funciona
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-[42px] md:leading-[1.1]">
            Três passos,{" "}
            <em className="font-serif-italic text-[1.2em] font-normal italic leading-none text-primary">
              cinco minutos
            </em>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Sem planilha pra manter. Sem app pra abrir toda hora. Vocês usam o que já usam: mensagem.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ n, Icon, title, text }) => (
            <article
              key={n}
              className="cartoon-panel relative rounded-[20px] bg-card p-7 transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <span className="hb-step-numeral select-none">{n}</span>
              <div className="cartoon-chrome mb-4 flex size-[54px] items-center justify-center rounded-[14px] bg-accent/70 text-(--brand-violet-700)">
                <Icon className="size-6" />
              </div>
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-snug text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
