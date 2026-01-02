# Ideias Futuras e Melhorias

Este arquivo registra ideias para implementação futura, sugestões de usuários e melhorias planejadas.

---

## Tarefas Pendentes de Implementação

### Onboarding

#### TASK-001: Alterar texto "Quem faz parte do seu orçamento?"

**Arquivos a modificar:**
- `src/components/onboarding/steps/step-household.tsx`

**Alterações necessárias:**
1. Linha 97-98: Alterar o título `<h2>` de "Quem faz parte do seu orçamento?" para "Quem mais faz parte do seu orçamento?"
2. Linhas 17-23: Remover o objeto com `key: "myself"` do array `HOUSEHOLD_OPTIONS`:
   ```typescript
   // REMOVER:
   {
     key: "myself",
     icon: "👤",
     label: "Eu mesmo(a)",
     description: "Você é o dono do orçamento",
   },
   ```
3. Linhas 59-73: Remover o case "myself" da função `getIsSelected` (já retorna `true` fixo, não é necessário)
4. Linha 113: Remover a prop `disabled={option.key === "myself"}` do componente `OnboardingCard`

**Contexto:** O usuário principal (owner) já está implícito no sistema. Esta etapa deve perguntar apenas sobre membros adicionais.

---

#### TASK-002: Corrigir botão "Pular por agora" no primeiro modal do onboarding

**Arquivos a modificar:**
- `src/components/onboarding/steps/step-intro.tsx`
- `src/components/onboarding/onboarding-modal.tsx`

**Problema identificado:**
- O componente `StepIntro` recebe a prop `onSkip` (linha 36-39 de step-intro.tsx)
- O `onboarding-modal.tsx` passa `handleSkipWithToast` para o `onSkip` (linha 88)
- A função `handleSkipWithToast` (linhas 74-80) chama `onSkip?.()` que vem das props do modal
- O problema pode estar no componente pai que renderiza o `OnboardingModal` - verificar se `onSkip` está sendo passado corretamente

**Alterações necessárias:**
1. Verificar o componente que renderiza `OnboardingModal` e garantir que `onSkip` está definido
2. A função `onSkip` deve:
   - Fechar o modal de onboarding
   - Opcionalmente salvar no localStorage que o usuário pulou o onboarding
   - Redirecionar o usuário para o dashboard ou próxima página

**Arquivos adicionais para verificar:**
- Procurar onde `<OnboardingModal` é utilizado e verificar se `onSkip` está sendo passado

---

#### TASK-003: Adicionar etapa de custo de moradia após "Conte-nos sobre sua moradia"

**Arquivos a modificar:**
- `src/components/onboarding/steps/step-housing.tsx` (ou criar novo step)
- `src/components/onboarding/hooks/use-onboarding.ts` (adicionar campos ao estado)
- `src/components/onboarding/onboarding-modal.tsx` (adicionar novo step no fluxo)
- `src/db/schema/transactions.ts` (para criar transações de parcelas)

**Novo step a criar:** `step-housing-costs.tsx`

**Estrutura do estado a adicionar no hook `use-onboarding.ts`:**
```typescript
interface HousingCostsData {
  // Para ALUGUEL (housing === "rent")
  rentAmount: number;        // Valor do aluguel em centavos
  rentDueDay: number;        // Dia do vencimento (1-31)

  // Para FINANCIADO (housing === "mortgage")
  mortgageCurrentAmount: number;   // Valor da parcela atual em centavos
  mortgageLastAmount: number;      // Valor da última parcela em centavos
  mortgageRemainingMonths: number; // Quantidade de meses restantes
  mortgagePaidThisMonth: boolean;  // Checkbox "Já paguei este mês"

  // Para PRÓPRIO ou FINANCIADO - IPTU
  hasIptu: boolean;
  iptuPaymentType: "single" | "installments"; // Parcela única ou parcelado
  iptuAmount: number;        // Valor da parcela/total em centavos
  iptuStartMonth: number;    // Mês de início (1-12, geralmente janeiro)
  iptuInstallments: number;  // Número de parcelas (se parcelado, geralmente 10-12)
}
```

**Lógica de criação de transações (ao finalizar onboarding):**

Para FINANCIAMENTO:
1. Calcular valor de cada parcela usando interpolação linear entre parcela atual e última
2. Criar transações do tipo "expense" com `status: "pending"` para cada mês restante
3. Se `mortgagePaidThisMonth === true`, marcar a primeira como `status: "cleared"`
4. Vincular à categoria "Aluguel/Financiamento" (ou criar se não existir)
5. Criar na tabela `monthly_allocations` os valores planejados para cada mês

Para IPTU:
1. Se `iptuPaymentType === "single"`: criar 1 transação no mês de vencimento (geralmente janeiro ou fevereiro)
2. Se `iptuPaymentType === "installments"`: criar N transações começando em `iptuStartMonth`
3. Todas como `status: "pending"`, categoria "IPTU" ou "IPTU/IPVA"

**UI do novo step:**
```
┌─────────────────────────────────────────────────────────────────┐
│  💰 Custos da sua moradia                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Se housing === "rent"]                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Valor do aluguel mensal     R$ [___________]            │   │
│  │ Dia do vencimento           [__] (1-31)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Se housing === "mortgage"]                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Valor da parcela atual      R$ [___________]            │   │
│  │ Valor da última parcela     R$ [___________]            │   │
│  │ Meses restantes             [___]                       │   │
│  │ ☐ Já paguei a parcela deste mês                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Se housing !== "free"]                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Você paga IPTU?             [Sim] [Não]                 │   │
│  │ [Se sim]                                                │   │
│  │ Como paga?  ○ Parcela única  ○ Parcelado               │   │
│  │ Valor       R$ [___________]                            │   │
│  │ [Se parcelado] Qtd parcelas [__]                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### TASK-004: Remover IPTU de "Detalhar contas de casa"

**Arquivos a modificar:**
- `src/components/onboarding/steps/step-expenses.tsx`

**Alteração necessária:**
Linhas 49-57: Remover o item "iptu" do array `UTILITY_ITEMS`:
```typescript
// REMOVER:
{ value: "iptu", icon: "🏠", label: "IPTU" },
```

**Contexto:** O IPTU será configurado na nova etapa de custos de moradia (TASK-003), evitando duplicidade.

---

#### TASK-005: Corrigir acentuação no onboarding

**Arquivos a verificar e corrigir:**
1. `src/components/onboarding/steps/step-housing.tsx`:
   - Linha 30: "Tenho imovel financiado" → "Tenho imóvel financiado"
   - Linha 31: "Pago prestacao do financiamento" → "Pago prestação do financiamento"
   - Linha 35: "Tenho imovel quitado" → "Tenho imóvel quitado"
   - Linha 36: "Pago IPTU e condominio" → "Pago IPTU e condomínio"
   - Linha 42: "Moro com familia/sem custo fixo" → "Moro com família/sem custo fixo"
   - Linha 43: "Nao tenho custo de moradia" → "Não tenho custo de moradia"
   - Linha 62: "Isso nos ajuda a criar as categorias certas para voce" → "Isso nos ajuda a criar as categorias certas para você"

2. `src/components/onboarding/steps/step-expenses.tsx`:
   - Linha 27: "Luz, agua, gas, internet" → "Luz, água, gás, internet"
   - Linha 38: "Saude" → "Saúde"
   - Linha 39: "Plano, remedios, consultas" → "Plano, remédios, consultas"
   - Linha 44: "Educacao" → "Educação"
   - Linha 63: "Alimentacao fora" → "Alimentação fora"
   - Linha 69: "Vestuario" → "Vestuário"
   - Linha 70: "Roupas e calcados" → "Roupas e calçados"
   - Linha 87: "Cabelo, estetica, etc" → "Cabelo, estética, etc"
   - Linha 117: "Quais despesas voce tem regularmente?" → "Quais despesas você tem regularmente?"
   - Linha 120: "Selecione as categorias que fazem sentido para voce" → "Selecione as categorias que fazem sentido para você"

**Dica:** Fazer uma busca global por palavras sem acento comum: "voce", "nao", "imovel", "orcamento", "prestacao", "condominio", "familia", "agua", "gas", "saude", "remedios", "educacao", "alimentacao", "vestuario", "calcados", "estetica"

---

#### TASK-006: Alterar nome da categoria de carro

**Arquivos a modificar:**
- `src/app/(in-app)/app/categories/setup/page.tsx`

**Alteração necessária:**
Linha 110: Alterar o nome da categoria:
```typescript
// DE:
{ name: "Carro Novo", icon: "🚙" },
// PARA:
{ name: "Carro", icon: "🚙" },
```

**Observação:** Verificar se existem outros lugares onde "Carro (Combustível/Manutenção)" pode aparecer. Buscar no código por essa string.

---

### Rota /app/income/setup

#### TASK-007: Ajustar botões na página de configuração de renda

**Arquivo a modificar:**
- `src/app/(in-app)/app/income/setup/page.tsx`

**Problema identificado:**
- Linhas 500-510: Existem dois botões no footer:
  1. "Adicionar Renda" (linha 501-504)
  2. "Continuar para Orçamento" (linha 506-509)
- Já existe um botão "Nova Renda" no header (linha 365-368)
- E um botão "Adicionar Renda" no estado vazio (linha 492-495)

**Alterações necessárias:**
1. Remover o botão "Adicionar Renda" redundante do footer (linhas 501-504)
2. Adicionar um botão "Voltar para Contas" que redireciona para `/app/accounts`:
```typescript
<div className="flex items-center justify-between border-t pt-4">
  <Button variant="outline" onClick={() => router.push("/app/accounts")}>
    <ArrowLeft className="mr-2 h-4 w-4" />
    Voltar para Contas
  </Button>

  <Button onClick={handleContinue} disabled={incomeSources.length === 0}>
    Continuar para Orçamento
    <ArrowRight className="ml-2 h-4 w-4" />
  </Button>
</div>
```

---

### Rota /app/budget/setup

#### TASK-008: Criar rota /app/budget/setup

**Arquivos a criar:**
- `src/app/(in-app)/app/budget/setup/page.tsx`

**Objetivo:**
Criar uma página intermediária de setup do orçamento que guie o usuário no primeiro uso.

**Funcionalidades sugeridas:**
1. Exibir resumo das categorias criadas (agrupadas por grupo)
2. Exibir resumo das fontes de renda configuradas
3. Mostrar o total disponível para alocar
4. Botão "Começar a planejar" que redireciona para `/app/budget`
5. Link para voltar e ajustar categorias/rendas se necessário

**Fluxo de tutorial sugerido:**
```
/app/categories/setup → /app/income/setup → /app/budget/setup → /app/budget
```

**Estrutura básica do componente:**
```typescript
export default function BudgetSetupPage() {
  // Buscar: categorias, rendas, grupos
  // Exibir resumo
  // Botões de navegação
}
```

---

### Página de Budget (/app/budget)

#### TASK-009: Corrigir carregamento de data no modal de edição

**Arquivos a verificar:**
- `src/app/(in-app)/app/budget/page.tsx`
- API: `src/app/api/app/allocations/route.ts` (verificar se dueDay é retornado)

**Problema identificado:**
- Linhas 404-412 (`openEditModal`): Os campos `editDueDay`, `editWeekday`, `editYearMonth` são inicializados como `null`
- Comentário no código (linha 408-411): "TODO: load from category when available"
- A data de vencimento não está sendo salva/carregada corretamente

**Alterações necessárias:**
1. Verificar se a tabela `categories` ou `monthly_allocations` tem campo para `dueDay`
2. Se não existir, adicionar ao schema:
   ```typescript
   // Em src/db/schema/categories.ts
   dueDay: integer("due_day"), // Dia do vencimento (1-31)
   ```
3. Atualizar a API de allocations para retornar o `dueDay`
4. Na função `openEditModal`, carregar o valor do `dueDay`:
   ```typescript
   setEditDueDay(category.dueDay || null);
   ```
5. Na função `handleSaveAllocation`, salvar o `dueDay` junto com a alocação

**Verificar também:**
- Se a API `POST /api/app/allocations` aceita e persiste o campo `dueDay`
- Se o campo está sendo enviado no body da requisição (linha 468-479)

---

#### TASK-010: Implementar funcionalidade "Faltando" no budget

**Arquivo a modificar:**
- `src/app/(in-app)/app/budget/page.tsx`

**Contexto:**
- Linha 160: `type FilterType = "all" | "underfunded" | "overfunded" | "money_available";`
- O filtro "underfunded" deveria mostrar categorias sem alocação

**Lógica a implementar:**
```typescript
const filteredGroupsData = useMemo(() => {
  if (activeFilter === "all") return groupsData;

  return groupsData.map(group => ({
    ...group,
    categories: group.categories.filter(cat => {
      switch (activeFilter) {
        case "underfunded":
          // Categorias que não têm valor alocado OU que têm menos que o planejado
          return cat.allocated === 0 || (cat.category.plannedAmount > 0 && cat.allocated < cat.category.plannedAmount);
        case "overfunded":
          return cat.allocated > cat.category.plannedAmount && cat.category.plannedAmount > 0;
        case "money_available":
          return cat.available > 0;
        default:
          return true;
      }
    })
  })).filter(group => group.categories.length > 0);
}, [groupsData, activeFilter]);
```

**UI:**
- Verificar onde os filtros são renderizados e garantir que "Faltando" (underfunded) está funcionando
- Procurar por componente `BudgetFilters` ou similar

---

#### TASK-011: Melhorar botão de copiar do mês anterior

**Arquivo a modificar:**
- `src/app/(in-app)/app/budget/page.tsx`

**Estado atual:**
- Linhas 254-257: Estados `isCopyingBudget`, `showCopyConfirm`, `showCopyHintModal`
- Existe lógica de cópia, mas sem opções de modo

**Alterações necessárias:**

1. Adicionar novo estado para modo de cópia:
```typescript
const [copyMode, setCopyMode] = useState<"all" | "empty_only" | null>(null);
```

2. Modificar o modal de confirmação para oferecer opções:
```tsx
<AlertDialog open={showCopyConfirm} onOpenChange={setShowCopyConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Copiar do mês anterior</AlertDialogTitle>
      <AlertDialogDescription>
        Como você deseja copiar os valores?
      </AlertDialogDescription>
    </AlertDialogHeader>

    <div className="flex flex-col gap-3 py-4">
      <Button
        variant={copyMode === "all" ? "default" : "outline"}
        onClick={() => setCopyMode("all")}
        className="justify-start"
      >
        <Copy className="mr-2 h-4 w-4" />
        Copiar todos os valores
        <span className="ml-auto text-xs text-muted-foreground">
          Sobrescreve todo o planejamento
        </span>
      </Button>

      <Button
        variant={copyMode === "empty_only" ? "default" : "outline"}
        onClick={() => setCopyMode("empty_only")}
        className="justify-start"
      >
        <Plus className="mr-2 h-4 w-4" />
        Copiar somente para o que está vazio
        <span className="ml-auto text-xs text-muted-foreground">
          Mantém valores já planejados
        </span>
      </Button>
    </div>

    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => handleCopyBudget(copyMode)}
        disabled={!copyMode}
      >
        Confirmar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

3. Modificar a função de cópia para aceitar o modo:
```typescript
const handleCopyBudget = async (mode: "all" | "empty_only") => {
  // Na API, passar o parâmetro mode
  const response = await fetch("/api/app/allocations/copy", {
    method: "POST",
    body: JSON.stringify({
      budgetId: budgets[0].id,
      fromYear: prevYear,
      fromMonth: prevMonth,
      toYear: currentYear,
      toMonth: currentMonth,
      mode: mode, // "all" ou "empty_only"
    }),
  });
};
```

4. Atualizar a API `POST /api/app/allocations/copy` para:
   - Se `mode === "all"`: deletar alocações existentes e copiar todas
   - Se `mode === "empty_only"`: copiar apenas para categorias sem alocação no mês destino

---

### Metas

#### TASK-012: Integrar metas no fluxo de onboarding/setup

**Arquivos a modificar:**
- `src/components/onboarding/steps/step-goals.tsx` (já existe, mas é simplificado)
- `src/app/(in-app)/app/goals/page.tsx` (página de metas existente)
- Criar: `src/app/(in-app)/app/goals/setup/page.tsx`

**Contexto atual:**
- O step `step-goals.tsx` do onboarding apenas coleta intenções (viagem, carro, casa, etc.)
- As metas reais são criadas em `/app/goals` com valores específicos

**Proposta de fluxo:**
1. Durante onboarding: coletar quais metas o usuário quer (já existe)
2. Após onboarding: redirecionar para `/app/goals/setup` para configurar valores:
   - Valor total da meta
   - Prazo (data limite)
   - Prioridade
3. Ao configurar metas: calcular `monthlyTarget = (targetAmount - currentAmount) / monthsRemaining`
4. Ao entrar em `/app/budget`: as metas já aparecem no grupo "Metas" com o valor sugerido

**Alterações no fluxo de tutorial:**
```
Onboarding → /app/categories/setup → /app/income/setup → /app/goals/setup → /app/budget/setup → /app/budget
```

**Campos a configurar por meta:**
- Nome (já vem do onboarding)
- Ícone (já vem do onboarding)
- Valor total (targetAmount)
- Valor já guardado (currentAmount, default 0)
- Data limite (targetDate)
- Cor (opcional)

---

### Página de Transações (/app/transactions)

#### TASK-013: Exibir contas fixas do planejamento nas transações

**Arquivos a modificar:**
- `src/app/(in-app)/app/transactions/page.tsx`
- `src/app/api/app/transactions/route.ts`
- Possivelmente criar: `src/app/api/app/scheduled-transactions/route.ts`

**Lógica a implementar:**

1. **Ao salvar alocação no budget** (quando categoria é do tipo "essencial" ou "fixa"):
   - Criar automaticamente uma transação com `status: "pending"`
   - Campos da transação:
     ```typescript
     {
       budgetId,
       categoryId,
       type: "expense",
       status: "pending",
       amount: allocated,
       description: category.name,
       date: new Date(year, month - 1, category.dueDay || 1),
       isRecurring: true,
       source: "budget", // Para diferenciar de transações manuais
     }
     ```

2. **Na página de transações:**
   - Buscar transações pendentes do mês atual
   - Exibir com indicador visual de "pendente" vs "pago"
   - Permitir marcar como pago (alterar `status` para "cleared")

3. **Identificar categorias fixas:**
   - Grupo "essential" geralmente tem contas fixas
   - Ou adicionar campo `isFixedExpense: boolean` na tabela `categories`

**UI sugerida:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Transações - Dezembro 2025                    [< Mês] [Mês >] │
├─────────────────────────────────────────────────────────────────┤
│  📅 Contas Pendentes (5)                                        │
│  ├─ ⏳ 💡 Luz .......................... R$ 150,00   [Marcar pago]│
│  ├─ ⏳ 💧 Água ......................... R$ 80,00    [Marcar pago]│
│  ├─ ⏳ 🔑 Aluguel ...................... R$ 1.500,00 [Marcar pago]│
│  └─ ...                                                         │
├─────────────────────────────────────────────────────────────────┤
│  📅 05/12 - Quinta-feira                                        │
│  ├─ ✅ 🛒 Mercado ...................... R$ 320,50              │
│  └─ ✅ ⛽ Combustível .................. R$ 200,00              │
├─────────────────────────────────────────────────────────────────┤
│  📅 03/12 - Terça-feira                                         │
│  └─ ✅ 🍔 iFood ....................... R$ 45,90               │
└─────────────────────────────────────────────────────────────────┘
```

---

#### TASK-014: Adicionar filtro por mês na página de transações

**Arquivo a modificar:**
- `src/app/(in-app)/app/transactions/page.tsx`

**Componentes a reutilizar:**
- Verificar o componente de navegação de mês usado em `/app/budget/page.tsx` (linhas 386-402)
- Pode ser extraído para componente compartilhado: `src/components/ui/month-navigator.tsx`

**Alterações necessárias:**

1. Adicionar estados de mês/ano:
```typescript
const today = new Date();
const [currentYear, setCurrentYear] = useState(today.getFullYear());
const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
```

2. Modificar a query de transações para filtrar por mês:
```typescript
const fetchTransactions = async () => {
  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0);

  const response = await fetch(
    `/api/app/transactions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
  );
  // ...
};
```

3. Adicionar navegação de mês no header:
```tsx
<div className="flex items-center gap-2">
  <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
    <ChevronLeft className="h-4 w-4" />
  </Button>
  <span className="font-medium min-w-[120px] text-center">
    {monthNames[currentMonth - 1]} {currentYear}
  </span>
  <Button variant="ghost" size="icon" onClick={handleNextMonth}>
    <ChevronRight className="h-4 w-4" />
  </Button>
</div>
```

---

#### TASK-015: Exibir salários e entradas como transações pendentes

**Arquivos a modificar:**
- `src/app/api/app/income-sources/route.ts` (POST)
- `src/app/(in-app)/app/transactions/page.tsx`

**Lógica a implementar:**

1. **Ao criar/atualizar fonte de renda:**
   - Criar transação pendente para o mês atual:
     ```typescript
     {
       budgetId,
       incomeSourceId: incomeSource.id,
       type: "income",
       status: "pending",
       amount: incomeSource.amount,
       description: incomeSource.name,
       date: new Date(year, month - 1, incomeSource.dayOfMonth || 1),
       memberId: incomeSource.memberId,
       accountId: incomeSource.accountId,
       source: "income_source",
     }
     ```

2. **Na página de transações:**
   - Mostrar receitas pendentes no topo, similar às despesas pendentes
   - Permitir marcar como "recebido" (status: "cleared")
   - Atualizar saldo da conta ao marcar como recebido

**UI sugerida:**
```
┌─────────────────────────────────────────────────────────────────┐
│  💰 Receitas Pendentes (2)                                      │
│  ├─ ⏳ 💼 Salário João ................ R$ 5.000,00  [Recebido] │
│  └─ ⏳ 🎁 VR Maria .................... R$ 800,00    [Recebido] │
└─────────────────────────────────────────────────────────────────┘
```

---

### Contas Fixas e Planejamento

#### TASK-016: Automatizar criação de contas pendentes a partir do planejamento

**Arquivos a modificar:**
- `src/app/api/app/allocations/route.ts` (POST)
- `src/db/schema/categories.ts` (adicionar campo `isFixedExpense`)
- Criar: `src/lib/services/scheduled-transactions.ts`

**Alterações no schema:**
```typescript
// Em src/db/schema/categories.ts
export const categories = pgTable("categories", {
  // ... campos existentes
  isFixedExpense: boolean("is_fixed_expense").default(false),
  dueDay: integer("due_day"), // Dia de vencimento (1-31)
});
```

**Serviço de transações agendadas:**
```typescript
// src/lib/services/scheduled-transactions.ts
export async function createPendingTransaction(params: {
  budgetId: string;
  categoryId: string;
  amount: number;
  year: number;
  month: number;
  dueDay?: number;
}) {
  const { budgetId, categoryId, amount, year, month, dueDay } = params;

  // Verificar se já existe transação pendente para esta categoria/mês
  const existing = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.categoryId, categoryId),
      eq(transactions.status, "pending"),
      // ... filtro por mês
    ),
  });

  if (existing) {
    // Atualizar valor se mudou
    if (existing.amount !== amount) {
      await db.update(transactions)
        .set({ amount })
        .where(eq(transactions.id, existing.id));
    }
    return;
  }

  // Criar nova transação pendente
  await db.insert(transactions).values({
    id: createId(),
    budgetId,
    categoryId,
    type: "expense",
    status: "pending",
    amount,
    date: new Date(year, month - 1, dueDay || 1),
    description: category.name,
    source: "budget",
  });
}
```

**Categorias que devem gerar transações pendentes automaticamente:**
- Todas do grupo "essential" com `isFixedExpense: true`
- Exemplos: Aluguel, Financiamento, Luz, Água, Gás, Internet, Condomínio, IPTU

**Fluxo:**
1. Usuário aloca R$ 200 para "Luz" no budget de Dezembro/2025
2. Sistema cria transação: `{ type: "expense", status: "pending", amount: 20000, category: "Luz", date: "2025-12-10" }`
3. Transação aparece em `/app/transactions` como pendente
4. Usuário recebe a conta e marca como paga
5. Status muda para "cleared", saldo da conta é atualizado

---

## Metas (Ideias Futuras)

### Fluxo de Transações para Metas
- **Ideia**: Integrar metas no fluxo de transações existente
- **Como funcionaria**: No modal de transação, ao escolher tipo "Despesa", mostrar hierarquia:
  1. Selecionar Grupo (Essencial, Estilo de Vida, Prazeres, **Metas**)
  2. Se grupo = Metas, mostrar lista de metas ativas
  3. Depois selecionar categoria dentro da meta (opcional)
- **Benefício**: Reutiliza UI existente, usuário já conhece o fluxo
- **Consideração**: Pode ficar verboso. Testar com usuários primeiro.

### Categorias dentro de Metas
- **Ideia**: Metas podem ter sub-categorias para organizar gastos
- **Exemplo**: Meta "Viagem Disney" com categorias: Passagens, Hotel, Ingressos, Alimentação
- **Status**: Para v2, começar simples com valor único por meta

---

## Dashboard

### Substituir "Ações Rápidas"
- **Ideia**: Card de ações rápidas não está sendo muito útil
- **Sugestão**: Substituir por resumo de metas com progresso
- **Layout**: Cards pequenos mostrando % de cada meta ativa

---

## Transações

### Melhorar fluxo de categorização
- **Ideia**: Hierarquia Grupo > Categoria no modal
- **Status**: Avaliar após implementar metas

---

## UX Geral

### Celebrações
- **Ideia**: Animações/confetti quando usuário atinge marcos
- **Casos de uso**:
  - Meta 100% completa
  - Primeira meta criada
  - Mês fechado dentro do orçamento
- **Status**: Implementar versão simples primeiro, melhorar depois

---

## Notas de Feedback de Usuários

(Adicionar feedback aqui conforme recebido)

---

*Última atualização: Dezembro 2025*
