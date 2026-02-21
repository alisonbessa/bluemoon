import { appConfig } from "@/shared/lib/config";
import { WebPageJsonLd } from "next-seo";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Sobre Nós | ${appConfig.projectName}`,
  description: "Conheça mais sobre o HiveBudget, nossa missão e nossos valores.",
  openGraph: {
    title: `Sobre Nós | ${appConfig.projectName}`,
    description: "Conheça mais sobre o HiveBudget, nossa missão e nossos valores.",
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/about`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        width: 1200,
        height: 630,
        alt: "Sobre Nós",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Sobre Nós | ${appConfig.projectName}`,
    description: "Conheça mais sobre o HiveBudget, nossa missão e nossos valores.",
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <article className="py-16">
      <WebPageJsonLd
        useAppDir
        id={`${process.env.NEXT_PUBLIC_APP_URL}/about`}
        title={`Sobre Nós | ${appConfig.projectName}`}
        description="Conheça mais sobre o HiveBudget, nossa missão e nossos valores."
        isAccessibleForFree={true}
        publisher={{
          "@type": "Organization",
          name: appConfig.projectName,
          url: process.env.NEXT_PUBLIC_APP_URL,
        }}
      />
      <div className="mx-auto max-w-3xl space-y-12">
        <header className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
            Sobre o {appConfig.projectName}
          </h1>
          <p className="text-xl text-muted-foreground">
            Ajudando famílias brasileiras a tomarem o controle das suas finanças, juntas.
          </p>
        </header>

        <section className="space-y-4" aria-labelledby="mission">
          <h2 id="mission" className="text-2xl font-semibold">Nossa Missão</h2>
          <p className="leading-relaxed text-muted-foreground">
            No {appConfig.projectName}, acreditamos que organizar as finanças não precisa ser complicado. Nossa plataforma combina planejamento de orçamento inteligente com colaboração em tempo real, tornando mais fácil do que nunca para casais e famílias controlarem seu dinheiro juntos.
          </p>
        </section>

        <section className="space-y-4" aria-labelledby="values">
          <h2 id="values" className="text-2xl font-semibold">Nossos Valores</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <article className="space-y-2">
              <h3 className="font-medium">Simplicidade</h3>
              <p className="text-sm text-muted-foreground">
                Acreditamos em tornar coisas complexas simples. Nossas ferramentas são poderosas e intuitivas, feitas para você focar no que importa — suas finanças.
              </p>
            </article>
            <article className="space-y-2">
              <h3 className="font-medium">Colaboração</h3>
              <p className="text-sm text-muted-foreground">
                Finanças em família funcionam melhor quando todos participam. Nossa plataforma permite que casais e famílias planejem e acompanhem juntos, com transparência.
              </p>
            </article>
            <article className="space-y-2">
              <h3 className="font-medium">Acessibilidade</h3>
              <p className="text-sm text-muted-foreground">
                Controle financeiro deve ser acessível para todos. Oferecemos preços justos e uma experiência pensada para o dia a dia do brasileiro.
              </p>
            </article>
            <article className="space-y-2">
              <h3 className="font-medium">Privacidade</h3>
              <p className="text-sm text-muted-foreground">
                Seus dados financeiros são seus. Tratamos sua privacidade com seriedade e nunca compartilhamos suas informações com terceiros.
              </p>
            </article>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="data-protection">
          <h2 id="data-protection" className="text-2xl font-semibold">Proteção de Dados</h2>
          <p className="leading-relaxed text-muted-foreground">
            O {appConfig.projectName} está em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>. Respeitamos seus direitos como titular de dados pessoais e oferecemos ferramentas para que você tenha controle total sobre suas informações:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Exportação de dados:</strong> você pode exportar todos os seus dados a qualquer momento nas Configurações.</li>
            <li><strong>Exclusão de conta:</strong> você pode solicitar a exclusão completa dos seus dados diretamente na Plataforma.</li>
            <li><strong>Transparência:</strong> detalhamos quais dados coletamos, como os utilizamos e com quem os compartilhamos em nossa <a href="/privacy" className="text-primary hover:underline">Política de Privacidade</a>.</li>
          </ul>
          <p className="leading-relaxed text-muted-foreground">
            Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing ou publicidade. Para mais informações, consulte nossos <a href="/terms" className="text-primary hover:underline">Termos de Uso</a> e nossa <a href="/privacy" className="text-primary hover:underline">Política de Privacidade</a>.
          </p>
        </section>
      </div>
    </article>
  );
}
