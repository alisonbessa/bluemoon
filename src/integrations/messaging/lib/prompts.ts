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
- Se o usuário mencionar como pagou (ex: "no cartão", "no débito", "com o flash", "no crédito"), identifique a conta
- Faça correspondência com as contas disponíveis: ${accountList}
- "cartão flash" ou "flash" -> conta Flash (benefício)
- "nubank", "roxinho" -> conta Nubank
- "cartão", "crédito" -> provavelmente cartão de crédito
- "débito", "conta corrente" -> conta bancária principal
- Se não mencionar forma de pagamento, deixe accountHint vazio

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
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 50.00, "description": "mercado", "categoryHint": "Alimentação", "accountHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "gastei 177 e 34 no restaurante"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 177.34, "description": "restaurante", "categoryHint": "Alimentação", "accountHint": "", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "paguei 200 de luz ontem"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.92, "data": {"amount": 200.00, "description": "conta de luz", "categoryHint": "Energia", "accountHint": "", "isInstallment": false, "totalInstallments": null, "date": "(data de ontem no formato YYYY-MM-DD)"}}

Entrada: "gastei 50 na churrascaria e paguei com o cartão flash"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 50.00, "description": "churrascaria", "categoryHint": "Alimentação", "accountHint": "Flash", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "comprei 80 de remédio no débito"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 80.00, "description": "remédio", "categoryHint": "Saúde", "accountHint": "conta corrente", "isInstallment": false, "totalInstallments": null, "date": null}}

Entrada: "comprei uma TV de 2000 em 10x no cartão"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 2000.00, "description": "TV", "categoryHint": "Eletrônicos", "accountHint": "cartão de crédito", "isInstallment": true, "totalInstallments": 10, "date": null}}

Entrada: "parcelei o sofá de 3500 em 12 vezes"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 3500.00, "description": "sofá", "categoryHint": "Casa", "accountHint": "", "isInstallment": true, "totalInstallments": 12, "date": null}}

Entrada: "gastei 600 no dentista em 3x"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.92, "data": {"amount": 600.00, "description": "dentista", "categoryHint": "Saúde", "accountHint": "", "isInstallment": true, "totalInstallments": 3, "date": null}}

Entrada: "gastei 30 no uber dia 15"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.93, "data": {"amount": 30.00, "description": "uber", "categoryHint": "Transporte", "accountHint": "", "isInstallment": false, "totalInstallments": null, "date": "(dia 15 do mês atual no formato YYYY-MM-DD)"}}

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
