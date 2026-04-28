import { Lock, Users, Target } from "lucide-react";

const PROMISES = [
  {
    Icon: Lock,
    title: "Privacidade configurável",
    text: "Tudo aberto, valores unificados ou contas privadas — vocês decidem o nível.",
  },
  {
    Icon: Users,
    title: "Acerto automático do mês",
    text: '"Você me deve R$ 340." Calculamos no dia 28, sem vocês precisarem lembrar.',
  },
  {
    Icon: Target,
    title: "Metas que são do casal",
    text: "Europa, apê, reserva — vejam juntos quanto falta e celebrem a cada depósito.",
  },
];

export function CartoonForCouples() {
  return (
    <section
      id="para-casais"
      className="bg-linear-to-b from-accent/30 to-background px-6 py-22 md:py-28"
    >
      <div className="mx-auto max-w-(--breakpoint-lg)">
        <div className="text-center">
          <p className="font-hand mb-1 inline-block -rotate-1 text-2xl font-bold text-primary">
            Feito pra dois
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-[42px] md:leading-[1.1]">
            Respeito, privacidade e{" "}
            <em className="font-serif-italic text-[1.2em] font-normal italic leading-none text-primary">
              menos briga
            </em>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Cada casal organiza o dinheiro de um jeito. HiveBudget se adapta ao de vocês, não o contrário.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PROMISES.map(({ Icon, title, text }) => (
            <div key={title} className="px-3 py-4 text-center">
              <div className="cartoon-panel mx-auto mb-3.5 flex size-16 items-center justify-center rounded-[18px] bg-card">
                <Icon className="size-7 text-primary" strokeWidth={2} />
              </div>
              <h3 className="text-[17px] font-bold tracking-tight">{title}</h3>
              <p className="mx-auto mt-1.5 max-w-72 text-sm leading-snug text-muted-foreground">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
