import type { UserContext } from "./types";

/**
 * Build the main prompt for parsing user messages
 */
export function buildParsePrompt(message: string, userContext: UserContext): string {
  const { categories, incomeSources, goals, accounts, pendingTransactions, currentMonth, currentYear } = userContext;

  const categoryList = categories.map((c) => c.name).join(", ") || "Nenhuma";
  const incomeSourceList = incomeSources.map((s) => s.name).join(", ") || "Nenhuma";
  const goalList = goals.map((g) => g.name).join(", ") || "Nenhuma";
  const accountList = accounts.map((a) => a.name).join(", ") || "Nenhuma";

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
- TRANSFER: Transferir entre contas (transferi, movi)
- UNKNOWN: Não conseguiu identificar

REGRAS DE VALOR:
- "50" = 50.00 reais
- "50,90" = 50.90 reais
- "R$ 50" = 50.00 reais
- Retorne o valor em REAIS (não centavos)
- IMPORTANTE: Se o usuário NÃO mencionar um valor numérico específico, retorne "amount": null
- NUNCA retorne "amount": 0 - sempre use null quando não houver valor explícito
- Exemplos que NÃO têm valor (retorne null): "recebi salário", "paguei a luz", "chegou o VR", "recebi o salário da Radix"
- Exemplos que TÊM valor: "recebi 5000", "paguei 200 de luz", "gastei 50"

REGRAS DE CATEGORIA:
- Se o usuário mencionar algo relacionado a uma categoria, sugira a mais provável
- Exemplos: "luz" → categoria de energia, "mercado" → categoria de alimentação
- Se não conseguir identificar, deixe categoryHint vazio

REGRAS DE RECEITA:
- "salário" → fonte de renda tipo salary
- "freelance" → fonte de renda tipo freelance
- "vr", "va" → fonte de renda tipo benefit

Responda APENAS com JSON válido no formato:
{
  "intent": "REGISTER_EXPENSE" | "REGISTER_INCOME" | "QUERY_BALANCE" | "QUERY_CATEGORY" | "QUERY_GOAL" | "TRANSFER" | "UNKNOWN",
  "confidence": 0.0 a 1.0,
  "data": {
    // Para REGISTER_EXPENSE:
    "amount": número em reais ou null se não mencionado,
    "description": "descrição opcional",
    "categoryHint": "nome da categoria mais provável ou vazio"

    // Para REGISTER_INCOME:
    "amount": número em reais ou null se não mencionado,
    "description": "descrição opcional",
    "incomeSourceHint": "nome da fonte de renda mais provável ou vazio"

    // Para QUERY_BALANCE:
    "queryType": "balance",
    "period": "month" (padrão)

    // Para QUERY_CATEGORY:
    "queryType": "category",
    "categoryName": "nome da categoria mencionada",
    "period": "month"

    // Para QUERY_GOAL:
    "queryType": "goal",
    "goalName": "nome da meta mencionada"

    // Para TRANSFER:
    "amount": numero em reais,
    "fromAccountHint": "conta de origem",
    "toAccountHint": "conta de destino"
  }
}

EXEMPLOS:

Entrada: "gastei 50 no mercado"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.95, "data": {"amount": 50.00, "description": "mercado", "categoryHint": "Alimentação"}}

Entrada: "paguei 200 de luz"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.92, "data": {"amount": 200.00, "description": "conta de luz", "categoryHint": "Energia"}}

Entrada: "recebi 5000 de salário"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.95, "data": {"amount": 5000.00, "description": "salário", "incomeSourceHint": "Salário"}}

Entrada: "recebi salário da Radix"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.90, "data": {"amount": null, "description": "salário", "incomeSourceHint": "Radix"}}

Entrada: "paguei a conta de luz"
Resposta: {"intent": "REGISTER_EXPENSE", "confidence": 0.88, "data": {"amount": null, "description": "conta de luz", "categoryHint": "Energia"}}

Entrada: "chegou o VR"
Resposta: {"intent": "REGISTER_INCOME", "confidence": 0.85, "data": {"amount": null, "description": "VR", "incomeSourceHint": "Vale Refeição"}}

Entrada: "quanto gastei esse mês?"
Resposta: {"intent": "QUERY_BALANCE", "confidence": 0.95, "data": {"queryType": "balance", "period": "month"}}

Entrada: "quanto sobrou de alimentação?"
Resposta: {"intent": "QUERY_CATEGORY", "confidence": 0.90, "data": {"queryType": "category", "categoryName": "Alimentação", "period": "month"}}

Entrada: "como tá minha meta da viagem?"
Resposta: {"intent": "QUERY_GOAL", "confidence": 0.88, "data": {"queryType": "goal", "goalName": "viagem"}}

Entrada: "transferi 500 da conta corrente pra poupança"
Resposta: {"intent": "TRANSFER", "confidence": 0.90, "data": {"amount": 500.00, "fromAccountHint": "conta corrente", "toAccountHint": "poupança"}}

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
