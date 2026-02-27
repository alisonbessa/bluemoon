# Plano: Modelo de Contribuição Flexível

## Contexto
O sistema atual soma toda a renda cadastrada e subtrai todas as despesas para calcular o saldo.
No cenário onde cada membro mantém parte da renda para si (Caso C), o saldo fica inflado porque
inclui dinheiro que nunca esteve disponível para o orçamento compartilhado.

## Decisões tomadas com o usuário
- Suportar os 3 cenários: renda única (A), renda junta (B), renda parcial (C)
- Contribuição explícita: cada membro define quanto contribui
- Valor padrão na renda + override mensal via monthly_income_allocations
- Toggle no dashboard para alternar visão compartilhada/completa
- Privacidade configurável por orçamento (os dois escolhem, mudança exige confirmação por email)
- Se contributionAmount = null, comporta-se como hoje (100% = contribuição total)

---

## Etapas de Implementação

### 1. Schema: Adicionar campo de contribuição na income_sources
**Arquivo:** `src/db/schema/income-sources.ts`
- Adicionar campo `contributionAmount` (integer, nullable, em centavos)
- Quando `null`, significa 100% da renda é contribuição (backward compatible)
- Quando preenchido, representa o valor que vai pro orçamento compartilhado

### 2. Schema: Adicionar campo de contribuição na monthly_income_allocations
**Arquivo:** `src/db/schema/monthly-income-allocations.ts`
- Adicionar campo `contributionPlanned` (integer, nullable, em centavos)
- Override mensal do contributionAmount padrão da income source
- Quando `null`, usa o padrão da income source

### 3. Schema: Adicionar configuração de privacidade no budget
**Arquivo:** `src/db/schema/budgets.ts`
- Adicionar campo `privacyMode` com enum: "visible" | "totals_only" | "private"
- Default: "visible" (tudo visível, como hoje)
- Adicionar `pendingPrivacyMode` (nullable) para mudanças pendentes de confirmação
- Adicionar `privacyChangeRequestedBy` (nullable, text) para rastrear quem pediu a mudança

### 4. Validation schemas
**Arquivos:** `src/shared/lib/validations/income.schema.ts`, `budget.schema.ts`
- Adicionar `contributionAmount` nos schemas de create/update de income source
- Adicionar `contributionPlanned` no schema de allocation
- Adicionar `privacyMode` no schema de update de budget
- Validação: contributionAmount <= amount (não pode contribuir mais do que ganha)

### 5. Migration
- Gerar migration com drizzle-kit para os novos campos
- Campos nullable, então zero impacto nos dados existentes

### 6. API: Atualizar cálculo de renda na rota de allocations
**Arquivo:** `src/app/api/app/allocations/route.ts`
- Na seção de income (linhas ~317-431), ao calcular o total planejado:
  - Usar `contributionPlanned` da monthly allocation se existir
  - Senão, usar `contributionAmount` da income source
  - Senão, usar `amount` (comportamento atual = 100%)
- Adicionar no response: `totalIncome` (renda bruta) vs `totalContribution` (contribuição)
- Manter `planned` e `received` baseados na contribuição, não na renda total

### 7. API: Endpoint de configuração de privacidade
**Arquivo:** novo `src/app/api/app/budgets/[budgetId]/privacy/route.ts`
- PATCH: solicitar mudança de privacidade
  - Salva em `pendingPrivacyMode` e `privacyChangeRequestedBy`
  - Envia email ao parceiro pedindo confirmação
- POST: confirmar mudança (via link no email)
  - Move `pendingPrivacyMode` → `privacyMode`
  - Limpa campos pendentes

### 8. Dashboard: Atualizar tipos e hook
**Arquivo:** `src/features/dashboard/types.ts`
- Expandir `MonthSummary`:
  ```ts
  income: {
    planned: number;        // contribuição planejada
    received: number;       // contribuição recebida
    totalPlanned: number;   // renda bruta planejada
    totalReceived: number;  // renda bruta recebida
  }
  ```

**Arquivo:** `src/features/dashboard/hooks/use-dashboard-data.ts`
- Adicionar estado `viewMode: "shared" | "complete"`
- Recalcular monthSummary baseado no viewMode

### 9. Dashboard: Toggle de visão
**Arquivo:** `src/app/(in-app)/app/page.tsx`
- Adicionar toggle/switch acima dos summary cards
- "Visão compartilhada" (padrão) vs "Visão completa"
- Visão compartilhada: saldo = contribuições - despesas compartilhadas
- Visão completa: mostra renda total, contribuições, e breakdown completo

### 10. UI: Formulário de renda
**Arquivo:** componente de criação/edição de income source
- Adicionar campo "Contribuição para o orçamento" abaixo do valor da renda
- Mostrar cálculo automático: "Reserva pessoal: R$ X" (amount - contributionAmount)
- Campo opcional: se vazio, assume 100%

### 11. UI: Configurações de privacidade
**Arquivo:** página de configurações do orçamento
- Seção "Privacidade dos gastos pessoais"
- 3 opções com radio buttons
- Indicador de "mudança pendente" quando houver solicitação não confirmada

### 12. Email: Template de confirmação de privacidade
- Template para notificar o parceiro sobre mudança de privacidade
- Link de confirmação/rejeição

---

## Mudanças no WhatsApp / Telegram

### 13. Query Executor: Saldo com modelo de contribuição
**Arquivo:** `src/integrations/messaging/lib/query-executor.ts`
- Ao responder "quanto gastei?" / "saldo" / "resumo":
  - Mostrar **contribuição total** ao invés de **renda total** como base do saldo
  - Formato atualizado:
    ```
    Resumo de fevereiro/2026

    Contribuição do casal: R$ 6.000,00
    Despesas compartilhadas: R$ 4.500,00
    Saldo compartilhado: +R$ 1.500,00

    (Renda total: R$ 8.000,00 | Reserva pessoal: R$ 2.000,00)
    ```
  - A linha de "renda total / reserva pessoal" só aparece se houver diferença (Caso C)
  - Nos Casos A e B (contribuição = 100%), o formato fica igual ao atual

### 14. Query Executor: Privacidade nos relatórios
**Arquivo:** `src/integrations/messaging/lib/query-executor.ts`
- Ao responder queries, verificar `privacyMode` do orçamento
- Se `privacyMode = "totals_only"`:
  - Membro A perguntando sobre gastos pessoais de B → mostrar só o total, sem detalhes
  - Membro A perguntando sobre seus próprios gastos → detalhes normais
- Se `privacyMode = "private"`:
  - Membro A não vê nada dos gastos pessoais de B
- Se `privacyMode = "visible"` → comportamento atual (tudo visível)
- Determinar "quem está perguntando" via `telegramUsers.userId` / `whatsappUsers.userId`

### 15. User Context: Incluir dados de contribuição
**Arquivo:** `src/integrations/messaging/lib/user-context.ts`
- Ao montar o contexto do usuário, incluir:
  - `contributionAmount` de cada income source (além do `amount`)
  - `privacyMode` do orçamento
  - Identificação de qual membro está interagindo
- Isso permite que a IA entenda o contexto de contribuição ao processar mensagens

### 16. Income Registration via chat: Clarificar contribuição
**Arquivo:** `src/integrations/messaging/lib/ai-handlers.ts`
- Quando usuário diz "recebi 5000 de salário":
  - Registrar como renda total (amount = 5000), como hoje
  - Se a income source tem `contributionAmount` configurado, o saldo do casal
    se ajusta automaticamente (não precisa mudar o fluxo de registro)
- Quando usuário pergunta "quanto recebi?":
  - Mostrar renda total do membro, com indicação de quanto foi contribuição
  - Ex: "Você recebeu R$ 5.000,00 (contribuição ao casal: R$ 3.000,00)"

### 17. Prompts: Atualizar contexto para a IA
**Arquivo:** `src/integrations/messaging/lib/prompts.ts`
- Incluir no prompt do Gemini:
  - Conceito de contribuição (para que a IA entenda a diferença)
  - Instrução para que, ao responder sobre saldo, use contribuição como base
  - Informação de privacyMode para que a IA respeite restrições

### 18. Adapter: Novo formato de relatório de saldo
**Arquivos:** `src/integrations/telegram/lib/handlers.ts`, `src/integrations/whatsapp/lib/handlers.ts`
- Atualizar formatação das mensagens de saldo/resumo
- Adicionar linha condicional de "reserva pessoal" quando aplicável
- Respeitar privacyMode na formatação (ocultar detalhes pessoais do parceiro)

---

## Ordem de implementação sugerida

**Fase 1 - Backend (sem quebrar nada):**
1. Schema changes (etapas 1-3)
2. Migration (etapa 5)
3. Validation schemas (etapa 4)
4. API de allocations (etapa 6)

**Fase 2 - Dashboard:**
5. Tipos e hook (etapa 8)
6. Toggle de visão (etapa 9)

**Fase 3 - UI de configuração:**
7. Formulário de renda (etapa 10)
8. Configurações de privacidade (etapa 11)
9. API de privacidade + email (etapas 7, 12)

**Fase 4 - Messaging (WhatsApp/Telegram):**
10. User context (etapa 15)
11. Prompts (etapa 17)
12. Query executor (etapas 13, 14)
13. Income handler (etapa 16)
14. Adapters/formatação (etapa 18)
