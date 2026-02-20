import type { UserContext } from "./types";

// Labels for account types in Portuguese
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: "conta",
  savings: "poupanca",
  credit_card: "cartao",
  cash: "dinheiro",
  investment: "investimento",
  benefit: "beneficio",
};

/**
 * Build the main prompt for parsing user messages
 */
export function buildParsePrompt(message: string, userContext: UserContext): string {
  const { categories, incomeSources, goals, accounts, pendingTransactions, currentMonth, currentYear } = userContext;

  const categoryList = categories.map((c) => c.name).join(", ") || "Nenhuma";
  const incomeSourceList = incomeSources.map((s) => s.name).join(", ") || "Nenhuma";
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
    ? `\n\nTRANSACOES PENDENTES ESTE MES:
${pendingIncomes ? `Receitas aguardando:\n${pendingIncomes}` : ""}
${pendingExpenses ? `Despesas aguardando:\n${pendingExpenses}` : ""}`
    : "";

  return `Voce e um assistente financeiro brasileiro do HiveBudget. Analise a mensagem do usuario e extraia a intencao e dados financeiros.

CONTEXTO:
- Mes/Ano atual: ${currentMonth}/${currentYear}
- Categorias de despesa: ${categoryList}
- Fontes de renda: ${incomeSourceList}
- Metas: ${goalList}
- Contas: ${accountList}${pendingSection}

MENSAGEM DO USUARIO: "${message}"

INSTRUCOES:
1. Identifique a INTENCAO principal da mensagem
2. Extraia os DADOS relevantes (valor, descricao, categoria, etc.)
3. Atribua um nivel de CONFIANCA de 0.0 a 1.0

INTENCOES VALIDAS:
- REGISTER_EXPENSE: Registrar um gasto (gastei, paguei, comprei)
- REGISTER_INCOME: Registrar uma receita (recebi, entrou, ganhei)
- QUERY_BALANCE: Consultar saldo geral (quanto gastei, saldo, sobrou)
- QUERY_CATEGORY: Consultar categoria especifica (quanto em alimentacao)
- QUERY_GOAL: Consultar meta (como esta minha meta)
- QUERY_ACCOUNT: Consultar saldo de conta especifica (quanto tenho na poupanca, saldo do nubank)
- TRANSFER: Transferir entre contas (transferi, movi)
- UNKNOWN: Nao conseguiu identificar

REGRAS DE VALOR:
- "50" = 50.00 reais
- "50,90" = 50.90 reais
- "R$ 50" = 50.00 reais
- "177 e 34" = 177.34 reais (X e Y = X reais e Y centavos)
- "25 e 50" = 25.50 reais
- "10 e 5" = 10.05 reais (centavos sempre com 2 digitos)
- Retorne o valor em REAIS (nao centavos)
- IMPORTANTE: Se o usuario NAO mencionar um valor numerico especifico, retorne "amount": null
- NUNCA retorne "amount": 0 - sempre use null quando nao houver valor explicito
- Exemplos que NAO tem valor (retorne null): "recebi salario", "paguei a luz", "chegou o VR", "recebi o salario da Radix"
- Exemplos que TEM valor: "recebi 5000", "paguei 200 de luz", "gastei 50", "gastei 177 e 34"

REGRAS DE CATEGORIA:
- Se o usuario mencionar algo relacionado a uma categoria, sugira a mais provavel
- Exemplos: "luz" -> categoria de energia, "mercado" -> categoria de alimentacao
- Se nao conseguir identificar, deixe categoryHint vazio

REGRAS DE RECEITA:
- "salario" -> fonte de renda tipo salary
- "freelance" -> fonte de renda tipo freelance
- "vr", "va" -> fonte de renda tipo benefit

REGRAS DE CONTA DE PAGAMENTO:
- Se o usuario mencionar como pagou (ex: "no cartao", "no debito", "com o flash", "no credito"), identifique a conta
- Faca correspondencia com as contas disponiveis: ${accountList}
- "cartao flash" ou "flash" -> conta Flash (beneficio)
- "nubank", "roxinho" -> conta Nubank
- "cartao", "credito" -> provavelmente cartao de credito
- "debito", "conta corrente" -> conta bancaria principal
- Se nao mencionar forma de pagamento, deixe accountHint vazio

REGRAS DE PARCELAMENTO:
- Identifique compras parceladas: "em X vezes", "Xx", "parcelado em X", "em X parcelas"
- Exemplos: "3x", "em 10x", "em 12 vezes", "parcelei em 5x", "dividi em 6"
- O numero de parcelas deve ser de 2 a 24
- Compras parceladas geralmente sao no cartao de credito
- Se mencionar parcelamento, retorne isInstallment: true e totalInstallments com o numero
- Se nao mencionar parcelamento, retorne isInstallment: false

Responda APENAS com JSON valido no formato:
{
  "intent": "REGISTER_EXPENSE" | "REGISTER_INCOME" | "QUERY_BALANCE" | "QUERY_CATEGORY" | "QUERY_GOAL" | "TRANSFER" | "UNKNOWN",
  "confidence": 0.0 a 1.0,
  "data": {
    // Para REGISTER_EXPENSE:
    "amount": numero em reais ou null se nao mencionado,
    "description": "descricao opcional",
    "categoryHint": "nome da categoria mais provavel ou vazio",
    "accountHint": "nome da conta usada para pagar ou vazio",
    "isInstallment": true ou false,
    "totalInstallments": numero de parcelas (2-24) ou null se nao parcelado

    // Para REGISTER_INCOME:
    "amount": numero em reais ou null se nao mencionado,
    "description": "descricao opcional",
    "incomeSourceHint": "nome da fonte de renda mais provavel ou vazio"

    // Para QUERY_BALANCE:
    "queryType": "balance",
    "period": "month" (padrao)

    // Para QUERY_CATEGORY:
    "queryType": "category",
    "categoryName": "nome da categoria mencionada",
    "period": "month"

    // Para QUERY_GOAL:
    "queryType": "goal",
    "goalName": "nome da meta mencionada"

    // Para QUERY_ACCOUNT:
    "queryType": "account",
    "accountName": "nome da conta mencionada"

    // Para TRANSFER:
    "amount": numero em reais,
    "fromAccountHint": "conta de origem",
    "toAccountHint": "conta de destino"
  }
}

EXEMPLOS:

Entrada: "gastei 50 no mercado"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 50.00, "description": "mercado", "categoryHint": "Alimentacao", "accountHint": "", "isInstallment": false, "totalInstallments": null}}

Entrada: "gastei 177 e 34 no restaurante"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 177.34, "description": "restaurante", "categoryHint": "Alimentacao", "accountHint": "", "isInstallment": false, "totalInstallments": null}}

Entrada: "paguei 200 de luz"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.92, "data": {"amount": 200.00, "description": "conta de luz", "categoryHint": "Energia", "accountHint": "", "isInstallment": false, "totalInstallments": null}}

Entrada: "gastei 50 na churrascaria e paguei com o cartao flash"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 50.00, "description": "churrascaria", "categoryHint": "Alimentacao", "accountHint": "Flash", "isInstallment": false, "totalInstallments": null}}

Entrada: "comprei 80 de remedio no debito"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 80.00, "description": "remedio", "categoryHint": "Saude", "accountHint": "conta corrente", "isInstallment": false, "totalInstallments": null}}

Entrada: "comprei uma TV de 2000 em 10x no cartao"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 2000.00, "description": "TV", "categoryHint": "Eletronicos", "accountHint": "cartao de credito", "isInstallment": true, "totalInstallments": 10}}

Entrada: "parcelei o sofa de 3500 em 12 vezes"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 3500.00, "description": "sofa", "categoryHint": "Casa", "accountHint": "", "isInstallment": true, "totalInstallments": 12}}

Entrada: "gastei 600 no dentista em 3x"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.92, "data": {"amount": 600.00, "description": "dentista", "categoryHint": "Saude", "accountHint": "", "isInstallment": true, "totalInstallments": 3}}

Entrada: "recebi 5000 de salario"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.95, "data": {"amount": 5000.00, "description": "salario", "incomeSourceHint": "Salario"}}

Entrada: "recebi salario da Radix"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.90, "data": {"amount": null, "description": "salario", "incomeSourceHint": "Radix"}}

Entrada: "paguei a conta de luz"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.88, "data": {"amount": null, "description": "conta de luz", "categoryHint": "Energia", "accountHint": "", "isInstallment": false, "totalInstallments": null}}

Entrada: "chegou o VR"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.85, "data": {"amount": null, "description": "VR", "incomeSourceHint": "Vale Refeicao"}}

Entrada: "quanto gastei esse mes?"
Resposta: {"intent": "QUERY_BALANCE", "confidence": 0.95, "data": {"queryType": "balance", "period": "month"}}

Entrada: "quanto sobrou de alimentacao?"
Resposta: {"intent": "QUERY_CATEGORY", "confidence": 0.90, "data": {"queryType": "category", "categoryName": "Alimentacao", "period": "month"}}

Entrada: "como ta minha meta da viagem?"
Resposta: {"intent": "QUERY_GOAL", "confidence": 0.88, "data": {"queryType": "goal", "goalName": "viagem"}}

Entrada: "quanto tenho na poupanca?"
Resposta: {"intent": "QUERY_ACCOUNT", "confidence": 0.90, "data": {"queryType": "account", "accountName": "poupanca"}}

Entrada: "qual o saldo do nubank?"
Resposta: {"intent": "QUERY_ACCOUNT", "confidence": 0.88, "data": {"queryType": "account", "accountName": "nubank"}}

Entrada: "transferi 500 da conta corrente pra poupanca"
Resposta: {"intent": "TRANSFER", "confidence": 0.90, "data": {"amount": 500.00, "fromAccountHint": "conta corrente", "toAccountHint": "poupanca"}}

Entrada: "oi"
Resposta: {"intent": "UNKNOWN", "confidence": 0.10, "data": null}

Entrada: "obrigado"
Resposta: {"intent": "UNKNOWN", "confidence": 0.10, "data": null}

AGORA ANALISE A MENSAGEM E RESPONDA APENAS COM O JSON:`;
}

/**
 * Build prompt for audio transcription
 */
export function buildTranscriptionPrompt(): string {
  return `Transcreva o audio acima em portugues brasileiro.
Retorne APENAS o texto transcrito, sem formatacao adicional.
Se nao conseguir entender o audio, retorne "AUDIO_NAO_COMPREENDIDO".
Mantenha numeros como digitos (ex: "50" nao "cinquenta").`;
}

/**
 * Build a prompt for category suggestion when AI is uncertain
 */
export function buildCategorySuggestionPrompt(
  description: string,
  categories: string[]
): string {
  return `Dado a descricao "${description}" e as categorias disponiveis: ${categories.join(", ")}.
Qual categoria e a mais provavel? Responda apenas com o nome da categoria.`;
}
