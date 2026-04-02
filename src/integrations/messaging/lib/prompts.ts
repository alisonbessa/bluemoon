import type { UserContext } from "./types";

// Labels for account types in Portuguese
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "conta",
  savings: "poupança",
  credit_card: "cartão",
  cash: "dinheiro",
  investment: "investimento",
  benefit: "benefício",
};

/**
 * Build the main prompt for parsing user messages
 */
export function buildParsePrompt(message: string, userContext: UserContext): string {
  const { categories, incomeSources, goals, accounts, pendingTransactions, currentMonth, currentYear } = userContext;

  const categoryList = categories.map((c) => c.name).join(", ") || "Nenhuma";
  const incomeSourceList = incomeSources.map((s) => {
    if (s.contributionAmount != null && s.contributionAmount !== s.amount) {
      return `${s.name} (contribui R$ ${(s.contributionAmount / 100).toFixed(2)} de R$ ${((s.amount ?? 0) / 100).toFixed(2)})`;
    }
    return s.name;
  }).join(", ") || "Nenhuma";
  const goalList = goals.map((g) => g.name).join(", ") || "Nenhuma";
  // Include account type to help AI distinguish between accounts with similar names
  const accountList = accounts
    .map((a) => `${a.name} (${ACCOUNT_TYPE_LABELS[a.type] || a.type})`)
    .join(", ") || "Nenhuma";

  // Format pending transactions for context
  const pendingIncomes = pendingTransactions
    .filter((t) => t.type === "income")
    .map((t) => `  - ${t.incomeSourceName || t.description || "Receita"}: R$ ${(t.amount / 100).toFixed(2)}`)
    .join("\n");

  const pendingExpenses = pendingTransactions
    .filter((t) => t.type === "expense")
    .map((t) => `  - ${t.categoryName || t.description || "Despesa"}: R$ ${(t.amount / 100).toFixed(2)}`)
    .join("\n");

  const pendingSection = (pendingIncomes || pendingExpenses)
    ? `\n\nTRANSAÇÕES PENDENTES ESTE MÊS:
${pendingIncomes ? `Receitas aguardando:\n${pendingIncomes}` : ""}
${pendingExpenses ? `Despesas aguardando:\n${pendingExpenses}` : ""}`
    : "";

  return `Você é um assistente financeiro brasileiro do HiveBudget. Analise a mensagem do usuário e extraia a intenção e dados financeiros.

CONTEXTO:
- Mês/Ano atual: ${currentMonth}/${currentYear}
- Categorias de despesa: ${categoryList}
- Fontes de renda: ${incomeSourceList}
- Metas: ${goalList}
- Contas: ${accountList}${pendingSection}

MENSAGEM DO USUÁRIO: "${message}"

INSTRUÇÕES:
1. Identifique a INTENÇÃO principal da mensagem
2. Extraia os DADOS relevantes (valor, descrição, categoria, etc.)
3. Atribua um nível de CONFIANÇA de 0.0 a 1.0

INTENÇÕES VÁLIDAS:
- REGISTER_EXPENSE: Registrar um gasto (gastei, paguei, comprei)
- REGISTER_INCOME: Registrar uma receita (recebi, entrou, ganhei)
- QUERY_BALANCE: Consultar saldo geral (quanto gastei, saldo, sobrou)
- QUERY_CATEGORY: Consultar categoria específica (quanto em alimentação)
- QUERY_GOAL: Consultar meta (como está minha meta)
- QUERY_ACCOUNT: Consultar saldo de conta específica (quanto tenho na poupança, saldo do nubank)
- TRANSFER: Transferir entre contas (transferi, movi)
- GREETING: Saudação ou agradecimento (oi, bom dia, obrigado)
- UNKNOWN: Não conseguiu identificar

REGRAS DE VALOR:
- "50" = 50.00 reais
- "50,90" = 50.90 reais
- "R$ 50" = 50.00 reais
- "177 e 34" = 177.34 reais (X e Y = X reais e Y centavos)
- "25 e 50" = 25.50 reais
- "10 e 5" = 10.05 reais (centavos sempre com 2 dígitos)
- Retorne o valor em REAIS (não centavos)
- IMPORTANTE: Se o usuário NÃO mencionar um valor numérico específico, retorne "amount": null
- NUNCA retorne "amount": 0 - sempre use null quando não houver valor explícito
- Exemplos que NÃO tem valor (retorne null): "recebi salário", "paguei a luz", "chegou o VR", "recebi o salário da Radix"
- Exemplos que TEM valor: "recebi 5000", "paguei 200 de luz", "gastei 50", "gastei 177 e 34"

REGRAS DE CATEGORIA:
- Se o usuário mencionar algo relacionado a uma categoria, sugira a mais provável
- Exemplos: "luz" -> categoria de energia, "mercado" -> categoria de alimentação
- Se não conseguir identificar, deixe categoryHint vazio

REGRAS DE RECEITA:
- "salário" -> fonte de renda tipo salary
- "freelance" -> fonte de renda tipo freelance
- "vr", "va" -> fonte de renda tipo benefit

REGRAS DE CONTA DE PAGAMENTO:
- Se o usuário mencionar como pagou, extraia o texto da forma de pagamento em accountHint
- Contas disponíveis: ${accountList}
- Extraia o nome/apelido da conta mencionada (ex: "no nubank" → accountHint: "nubank")
- Termos genéricos: "no cartão" → "cartao de credito", "no débito" → "debito", "em dinheiro" → "dinheiro"
- Métodos de pagamento: "por pix" → "pix", "paguei o boleto" → "boleto"
- Apelidos de bancos: "roxinho" → "nubank", "laranjinha" → "inter", "verdinho" → "next"
- Se mencionar parcelamento sem conta explícita, deixe accountHint vazio (será assumido cartão de crédito)
- Se não mencionar forma de pagamento, deixe accountHint vazio

REGRAS DE MÉTODO DE PAGAMENTO (paymentMethodHint):
- Identifique o MÉTODO de pagamento mencionado e preencha paymentMethodHint:
  - "pix", "fiz um pix", "paguei no pix" → paymentMethodHint: "pix"
  - "cartão", "crédito", "no cartão" → paymentMethodHint: "cartao_credito"
  - "débito", "no débito" → paymentMethodHint: "cartao_debito"
  - "boleto", "paguei o boleto" → paymentMethodHint: "boleto"
  - "dinheiro", "em espécie", "cash" → paymentMethodHint: "dinheiro"
  - "transferência", "transferi", "TED", "DOC" → paymentMethodHint: "transferencia"
  - Parcelamento implica cartão de crédito → paymentMethodHint: "cartao_credito"
- Se não mencionar método de pagamento, deixe paymentMethodHint vazio

REGRAS DE PARCELAMENTO:
- Identifique compras parceladas: "em X vezes", "Xx", "parcelado em X", "em X parcelas"
- Exemplos: "3x", "em 10x", "em 12 vezes", "parcelei em 5x", "dividi em 6"
- O número de parcelas deve ser de 2 a 24
- Compras parceladas geralmente são no cartão de crédito
- Se mencionar parcelamento, retorne isInstallment: true e totalInstallments com o número
- Se não mencionar parcelamento, retorne isInstallment: false

REGRAS DE DATA:
- A data atual é: ${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}
- "ontem" = data de ontem
- "anteontem" = 2 dias atrás
- "semana passada" = 7 dias atrás (aproximado)
- "dia 15", "no dia 15" = dia 15 do mês atual
- Se não mencionar data, retorne date: null (será usado hoje)
- Retorne no formato "YYYY-MM-DD"

REGRAS DE ESCOPO (individual vs casal):
- Se o usuário usar "eu", "meu", "minha" ou verbos na primeira pessoa do singular → scope: "individual"
- Se o usuário usar "nós", "nosso", "nossa", "a gente", "juntos", "casal" → scope: "couple"
- Exemplos: "quanto eu gastei?" → individual, "quanto gastamos?" → couple, "quanto a gente gastou?" → couple
- Se não for claro, retorne scope: null (padrão: mostra ambos)

REGRAS DE FORMATO CONCISO (MUITO IMPORTANTE):
- Muitos usuários enviam mensagens curtas sem verbo, no formato "valor descrição" ou "descrição valor"
- Exemplos: "Café 14,00", "50,00 mercado", "Uber 11,30", "Roupa 20,00", "Cabelo 80"
- Esses SEMPRE são REGISTER_EXPENSE com confiança 0.95
- O número é o valor em reais, o texto é a descrição
- Também funciona com data: "Uber 50,34 23/03", "87,00 açougue 19/03", "Roupa 20,00 23/03"
- "147,63 acordo banco Santander" = despesa de R$ 147,63, descrição "acordo banco Santander"
- "Perfumaria 144" = despesa de R$ 144, descrição "perfumaria"
- "Plano de saúde 1021,00" = despesa de R$ 1021, descrição "plano de saúde"
- "Paguei Plano de saúde 1021,00 dia 24/03" = despesa de R$ 1021, data 24/03
- Palavras como "Comprei", "Paguei", "Gastei com" no início são opcionais e não mudam a intenção
- Uma mensagem com APENAS texto sem número (ex: "Compras", "Cabelo") pode ser REGISTER_EXPENSE com amount null
- "Feira 35,00" = despesa de R$ 35, descrição "feira"
- NÃO retorne UNKNOWN para mensagens que claramente tem valor + descrição!

REGRAS PARA APENAS NÚMERO:
- Se a mensagem é APENAS um número (ex: "50", "200", "1021,00"), trate como REGISTER_EXPENSE
- Retorne amount com o valor e categoryHint vazio, confidence 0.85
- Exemplos: "50" → expense R$ 50, "1021,00" → expense R$ 1021
- Não confunda com contexto de receita (se o número vier após "recebi" é receita)

REGRAS DE SAUDAÇÃO:
- Se o usuário enviar uma saudação (oi, olá, bom dia, boa tarde, boa noite, e aí) retorne intent GREETING
- Se o usuário agradecer (obrigado, valeu, thanks, brigado) retorne intent GREETING
- Não confunda com intenções financeiras: "recebi bom dia" não é saudação

Responda APENAS com JSON válido no formato:
{
  "intent": "REGISTER_EXPENSE" | "REGISTER_INCOME" | "QUERY_BALANCE" | "QUERY_CATEGORY" | "QUERY_GOAL" | "TRANSFER" | "GREETING" | "UNKNOWN",
  "confidence": 0.0 a 1.0,
  "data": {
    // Para REGISTER_EXPENSE:
    "amount": número em reais ou null se não mencionado,
    "description": "descrição opcional",
    "categoryHint": "nome da categoria mais provável ou vazio",
    "accountHint": "nome da conta usada para pagar ou vazio",
    "paymentMethodHint": "pix" | "cartao_credito" | "cartao_debito" | "boleto" | "dinheiro" | "transferencia" | "",
    "isInstallment": true ou false,
    "totalInstallments": número de parcelas (2-24) ou null se não parcelado,
    "date": "YYYY-MM-DD" ou null se não mencionado

    // Para REGISTER_INCOME:
    "amount": número em reais ou null se não mencionado,
    "description": "descrição opcional",
    "incomeSourceHint": "nome da fonte de renda mais provável ou vazio",
    "date": "YYYY-MM-DD" ou null se não mencionado

    // Para QUERY_BALANCE:
    "queryType": "balance",
    "period": "month" (padrão),
    "scope": "individual" ou "couple" ou null

    // Para QUERY_CATEGORY:
    "queryType": "category",
    "categoryName": "nome da categoria mencionada",
    "period": "month",
    "scope": "individual" ou "couple" ou null

    // Para QUERY_GOAL:
    "queryType": "goal",
    "goalName": "nome da meta mencionada"

    // Para QUERY_ACCOUNT:
    "queryType": "account",
    "accountName": "nome da conta mencionada"

    // Para TRANSFER:
    "amount": número em reais,
    "fromAccountHint": "conta de origem",
    "toAccountHint": "conta de destino"
  }
}

EXEMPLOS:

Entrada: "gastei 50 no mercado"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 50.00, "description": "mercado", "categoryHint": "Alimentação", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "gastei 177 e 34 no restaurante"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 177.34, "description": "restaurante", "categoryHint": "Alimentação", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "paguei 200 de luz ontem"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.92, "data": {"amount": 200.00, "description": "conta de luz", "categoryHint": "Energia", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "(data de ontem no formato YYYY-MM-DD)"}}

Entrada: "gastei 50 na churrascaria e paguei com o cartão flash"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 50.00, "description": "churrascaria", "categoryHint": "Alimentação", "accountHint": "Flash", "paymentMethodHint": "cartao_credito", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "comprei 80 de remédio no débito"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 80.00, "description": "remédio", "categoryHint": "Saúde", "accountHint": "debito", "paymentMethodHint": "cartao_debito", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "paguei 150 de luz pelo nubank"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 150.00, "description": "conta de luz", "categoryHint": "Energia", "accountHint": "nubank", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "paguei 50 no pix pro encanador"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.90, "data": {"amount": 50.00, "description": "encanador", "categoryHint": "Casa", "accountHint": "pix", "paymentMethodHint": "pix", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "comprei uma TV de 2000 em 10x no cartão"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 2000.00, "description": "TV", "categoryHint": "Eletrônicos", "accountHint": "cartao de credito", "paymentMethodHint": "cartao_credito", "isInstallment": true, "totalInstallments": 10, "date": null}}

Entrada: "comprei 300 no cartão nubank em 3x"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 300.00, "description": null, "categoryHint": "", "accountHint": "nubank", "paymentMethodHint": "cartao_credito", "isInstallment": true, "totalInstallments": 3, "date": null}}

Entrada: "parcelei o sofá de 3500 em 12 vezes"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 3500.00, "description": "sofá", "categoryHint": "Casa", "accountHint": "", "paymentMethodHint": "cartao_credito", "isInstallment": true, "totalInstallments": 12, "date": null}}

Entrada: "gastei 600 no dentista em 3x"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.92, "data": {"amount": 600.00, "description": "dentista", "categoryHint": "Saúde", "accountHint": "", "paymentMethodHint": "cartao_credito", "isInstallment": true, "totalInstallments": 3, "date": null}}

Entrada: "gastei 30 no uber dia 15"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 30.00, "description": "uber", "categoryHint": "Transporte", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "(dia 15 do mês atual no formato YYYY-MM-DD)"}}

Entrada: "recebi 5000 de salário"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.95, "data": {"amount": 5000.00, "description": "salário", "incomeSourceHint": "Salário", "date": null}}

Entrada: "recebi salário da Radix"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.90, "data": {"amount": null, "description": "salário", "incomeSourceHint": "Radix", "date": null}}

Entrada: "paguei a conta de luz"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.88, "data": {"amount": null, "description": "conta de luz", "categoryHint": "Energia", "accountHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "chegou o VR"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.85, "data": {"amount": null, "description": "VR", "incomeSourceHint": "Vale Refeição", "date": null}}

Entrada: "quanto gastei esse mês?"
Resposta: {"intent": "QUERY_BALANCE", "confidence": 0.95, "data": {"queryType": "balance", "period": "month", "scope": null}}

Entrada: "quanto eu gastei?"
Resposta: {"intent": "QUERY_BALANCE", "confidence": 0.95, "data": {"queryType": "balance", "period": "month", "scope": "individual"}}

Entrada: "quanto a gente gastou esse mês?"
Resposta: {"intent": "QUERY_BALANCE", "confidence": 0.95, "data": {"queryType": "balance", "period": "month", "scope": "couple"}}

Entrada: "quanto nós gastamos?"
Resposta: {"intent": "QUERY_BALANCE", "confidence": 0.95, "data": {"queryType": "balance", "period": "month", "scope": "couple"}}

Entrada: "quanto sobrou de alimentação?"
Resposta: {"intent": "QUERY_CATEGORY", "confidence": 0.90, "data": {"queryType": "category", "categoryName": "Alimentação", "period": "month", "scope": null}}

Entrada: "como tá minha meta da viagem?"
Resposta: {"intent": "QUERY_GOAL", "confidence": 0.88, "data": {"queryType": "goal", "goalName": "viagem"}}

Entrada: "quanto tenho na poupança?"
Resposta: {"intent": "QUERY_ACCOUNT", "confidence": 0.90, "data": {"queryType": "account", "accountName": "poupança"}}

Entrada: "qual o saldo do nubank?"
Resposta: {"intent": "QUERY_ACCOUNT", "confidence": 0.88, "data": {"queryType": "account", "accountName": "nubank"}}

Entrada: "transferi 500 da conta corrente pra poupança"
Resposta: {"intent": "TRANSFER", "confidence": 0.90, "data": {"amount": 500.00, "fromAccountHint": "conta corrente", "toAccountHint": "poupança"}}

Entrada: "Café 14,00"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 14.00, "description": "café", "categoryHint": "Alimentação", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "Uber 11,30"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 11.30, "description": "uber", "categoryHint": "Transporte", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "Roupa 20,00 23/03"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 20.00, "description": "roupa", "categoryHint": "Vestuário", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "${currentYear}-03-23"}}

Entrada: "87,00 açougue 19/03"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 87.00, "description": "açougue", "categoryHint": "Alimentação", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "${currentYear}-03-19"}}

Entrada: "Plano de saúde 1021,00"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 1021.00, "description": "plano de saúde", "categoryHint": "Saúde", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "Cabelo 80"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 80.00, "description": "cabelo", "categoryHint": "", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "45,00 ração"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 45.00, "description": "ração", "categoryHint": "Pet", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "Uber 62,06 3 viagens"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 62.06, "description": "uber - 3 viagens", "categoryHint": "Transporte", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "147,63 acordo banco Santander"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.90, "data": {"amount": 147.63, "description": "acordo banco Santander", "categoryHint": "", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "Comprei Roupa Samuel filho Ryan 20,00 23/03"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 20.00, "description": "roupa Samuel filho Ryan", "categoryHint": "Vestuário", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "${currentYear}-03-23"}}

Entrada: "Sem parar 57,00 18/03"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 57.00, "description": "sem parar", "categoryHint": "Transporte", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "${currentYear}-03-18"}}

Entrada: "50,00 empréstimo irmã"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.90, "data": {"amount": 50.00, "description": "empréstimo irmã", "categoryHint": "", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "Gastei 40 reais em Nutella, pagar dia 05 de abril"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 40.00, "description": "Nutella", "categoryHint": "Alimentação", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "${currentYear}-04-05"}}

Entrada: "Pix para o marido 200,00 22/03"
Resposta: {"intent": "TRANSFER", "confidence": 0.90, "data": {"amount": 200.00, "fromAccountHint": "", "toAccountHint": "marido"}}

Entrada: "10,00 curso casais 19/03"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 10.00, "description": "curso casais", "categoryHint": "", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": "${currentYear}-03-19"}}

Entrada: "Cabelo"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.85, "data": {"amount": null, "description": "cabelo", "categoryHint": "", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "Compras"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.80, "data": {"amount": null, "description": "compras", "categoryHint": "", "accountHint": "", "paymentMethodHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "oi"
Resposta: {"intent": "GREETING", "confidence": 0.95, "data": {"type": "greeting"}}

Entrada: "obrigado"
Resposta: {"intent": "GREETING", "confidence": 0.95, "data": {"type": "thanks"}}

Entrada: "bom dia"
Resposta: {"intent": "GREETING", "confidence": 0.95, "data": {"type": "greeting"}}

AGORA ANALISE A MENSAGEM E RESPONDA APENAS COM O JSON:`;
}

/**
 * Build prompt for audio transcription
 */
export function buildTranscriptionPrompt(): string {
  return `Transcreva o áudio acima em português brasileiro.
Retorne APENAS o texto transcrito, sem formatação adicional.
Se não conseguir entender o áudio, retorne "AUDIO_NAO_COMPREENDIDO".
Mantenha números como dígitos (ex: "50" não "cinquenta").`;
}

/**
 * Build a prompt for category suggestion when AI is uncertain
 */
export function buildCategorySuggestionPrompt(
  description: string,
  categories: string[]
): string {
  return `Dado a descrição "${description}" e as categorias disponíveis: ${categories.join(", ")}.
Qual categoria é a mais provável? Responda apenas com o nome da categoria.`;
}
