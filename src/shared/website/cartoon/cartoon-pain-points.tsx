const PAINS = [
  { quote: "A gente não faz ideia pra onde foi o salário este mês.", who: "todo dia 28" },
  { quote: "Comecei uma planilha bonita em janeiro. Abandonei em fevereiro.", who: "todo ano" },
  { quote: "Quem pagou o mercado? Quanto eu te devo? Deixa pra lá…", who: "toda sexta" },
];

export function CartoonPainPoints() {
  return (
    <section className="bg-linear-to-b from-background to-card px-6 py-22 md:py-28">
      <div className="mx-auto max-w-(--breakpoint-lg)">
        <div className="text-center">
          <p className="font-hand mb-1 text-2xl font-bold text-primary -rotate-1 inline-block">
            Soa familiar?
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight md:text-[42px] md:leading-[1.1]">
            Toda semana a mesma{" "}
            <em className="font-hand text-[1.15em] not-italic font-bold leading-none text-primary">
              conversa
            </em>{" "}
            chata
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Dinheiro é uma das maiores causas de estresse entre casais. Não é vocês — é a ferramenta.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PAINS.map((pain) => (
            <div
              key={pain.quote}
              className="cartoon-panel relative rounded-[18px] bg-card p-6"
            >
              <div className="font-serif absolute left-4 top-5 text-5xl font-bold leading-[0.6] text-secondary">
                &ldquo;
              </div>
              <p className="mt-6 pl-1 text-[15px] italic leading-snug text-foreground">
                {pain.quote}
              </p>
              <div className="mt-3.5 text-xs font-semibold not-italic text-muted-foreground">
                — {pain.who}
              </div>
            </div>
          ))}
        </div>

        {/* Reframe block */}
        <div className="cartoon-panel mx-auto mt-12 max-w-2xl rounded-[22px] bg-linear-to-b from-accent/70 to-card p-7 text-center">
          <p className="text-sm text-muted-foreground">O problema não é falta de dinheiro.</p>
          <p className="mt-1.5 text-2xl font-extrabold leading-snug tracking-tight">
            É falta de <span className="text-primary">organização juntos</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
