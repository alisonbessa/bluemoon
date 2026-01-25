import { Check, X } from "lucide-react";

interface ComparisonItem {
  title: string;
  description: string;
}

export function WithWithout() {
  const withProduct: ComparisonItem[] = [
    {
      title: "Orçamento Inteligente",
      description:
        "Categorias organizadas em grupos (Essencial, Estilo de Vida, Prazeres, Investimentos, Metas) para você saber exatamente para onde vai seu dinheiro.",
    },
    {
      title: "Cartões de Crédito Brasileiros",
      description:
        "Suporte completo a datas de fechamento e vencimento de faturas. Entenda exatamente quando cada compra vai impactar seu orçamento.",
    },
    {
      title: "Parcelamentos Organizados",
      description:
        "Acompanhe todas as suas compras parceladas automaticamente. Saiba quanto ainda falta pagar em cada compra.",
    },
    {
      title: "Finanças em Casal",
      description:
        "Compartilhe o orçamento com seu parceiro(a). Cada um tem sua categoria de Prazeres pessoal.",
    },
    {
      title: "Entrada Rápida por Mensagem",
      description:
        "Registre gastos em segundos enviando uma mensagem pelo seu app favorito: 'gastei 50 no mercado'. A IA entende e categoriza automaticamente.",
    },
    {
      title: "Flexibilidade Total",
      description:
        "Mova dinheiro entre categorias quando a vida acontece. Seu orçamento se adapta à sua realidade.",
    },
  ];

  const withoutProduct: ComparisonItem[] = [
    {
      title: "Planilhas Confusas",
      description:
        "Gaste horas criando e mantendo planilhas que nunca ficam atualizadas.",
    },
    {
      title: "Cartão de Crédito = Dor de Cabeça",
      description:
        "Sem controle de quando cada compra cai na fatura. Surpresas todo mês.",
    },
    {
      title: "Parcelamentos Esquecidos",
      description:
        "Perca o controle de quantas parcelas faltam. Comprometa o orçamento futuro sem saber.",
    },
    {
      title: "Brigas por Dinheiro",
      description:
        "Sem visibilidade compartilhada, casais brigam por gastos que não foram comunicados.",
    },
    {
      title: "Esquece de Registrar",
      description:
        "Abrir app, criar transação, categorizar... é muito trabalho. Você desiste.",
    },
    {
      title: "Orçamento Rígido",
      description:
        "Apps inflexíveis que não permitem ajustes. Você abandona no primeiro imprevisto.",
    },
  ];

  return (
    <section className="py-16 px-4 md:px-6 lg:px-8" aria-label="Comparison" id="how-it-works">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Sinta a Diferença
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Without Product Section */}
          <div className="bg-red-50 dark:bg-red-950/30 p-6 rounded-lg border border-red-200 dark:border-red-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-red-500 p-2 rounded-full">
                <X className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-700 dark:text-red-400">
                Sem HiveBudget
              </h3>
            </div>
            <div className="space-y-6">
              {withoutProduct.map((item, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-red-700 dark:text-red-400">
                    {item.title}
                  </h4>
                  <p className="text-red-600 dark:text-red-300/90">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* With Product Section */}
          <div className="bg-green-50 dark:bg-green-950/30 p-6 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-500 p-2 rounded-full">
                <Check className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-green-700 dark:text-green-400">
                Com HiveBudget
              </h3>
            </div>
            <div className="space-y-6">
              {withProduct.map((item, index) => (
                <div key={index} className="space-y-2">
                  <h4 className="font-medium text-green-700 dark:text-green-400">
                    {item.title}
                  </h4>
                  <p className="text-green-600 dark:text-green-300/90">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
