# Plano: Fluxo Completo de Orçamento - HiveBudget

## Visão Geral

Implementar o fluxo completo de gerenciamento de orçamento inspirado no YNAB, adaptado para o padrão brasileiro (BRL, formato de data dd/mm/yyyy, etc.).

---

## 1. Fluxo de Configuração Inicial (Setup Wizard)

### 1.1 Criação de Categorias

**Objetivo:** Permitir que o usuário crie e organize categorias dentro dos grupos padrão.

**Grupos Padrão (já existem no DB):**
- 📌 Essencial (moradia, contas, mercado, transporte, saúde)
- 🎨 Estilo de Vida (alimentação fora, vestuário, streaming, academia)
- 🎉 Prazeres (categoria por membro da família)
- 💰 Investimentos (emergência, previdência, aplicações)
- 🎯 Metas (viagem, carro, casa, casamento)

**Categorias Sugeridas por Grupo:**

```
ESSENCIAL:
- 🏠 Aluguel/Financiamento
- 💡 Contas de Casa (luz, água, gás, internet)
- 🛒 Mercado
- 🚗 Transporte (combustível, IPVA, seguro)
- 💊 Saúde (plano, farmácia)
- 📚 Educação

ESTILO DE VIDA:
- 🍔 Alimentação Fora
- 👕 Vestuário
- 📺 Streaming (Netflix, Spotify)
- 🏋️ Academia
- 💇 Beleza
- 🎮 Lazer

PRAZERES:
- [Criado automaticamente para cada membro]
- Ex: "Prazeres de João", "Prazeres de Maria"

INVESTIMENTOS:
- 🛡️ Reserva de Emergência
- 🏦 Previdência
- 📈 Investimentos

METAS:
- ✈️ Viagem
- 🚗 Carro Novo
- 🏠 Casa Própria
- [Metas personalizadas]
```

**Tela:** `/app/categories/setup`
- Mostrar grupos em accordion expandível
- Categorias sugeridas com checkbox para ativar
- Botão para adicionar categoria personalizada
- Arrastar para reordenar

**API:**
- `GET /api/app/categories` - Listar categorias do budget
- `POST /api/app/categories` - Criar categoria
- `PATCH /api/app/categories/[id]` - Atualizar categoria
- `DELETE /api/app/categories/[id]` - Remover categoria
- `POST /api/app/categories/reorder` - Reordenar categorias

---

### 1.2 Configuração de Contas (já parcialmente implementado)

**Melhorias necessárias:**
- Vincular cartão de crédito à conta corrente para pagamento
- Adicionar "Conta para Pagamento" no formulário de cartão de crédito

**Schema - Adicionar campo:**
```typescript
// Em financialAccounts
paymentAccountId: text("payment_account_id")
  .references(() => financialAccounts.id, { onDelete: "set null" })
```

---

### 1.3 Configuração de Entradas (Receitas)

**Objetivo:** Cadastrar fontes de renda recorrentes.

**Tipos de Receita:**
- 💼 Salário (com data de pagamento)
- 🍽️ Benefício (VR/VA - já temos no account type)
- 💰 Renda Extra
- 📈 Rendimentos
- 🎁 Outras

**Nova Tabela: `income_sources`**
```typescript
export const incomeSources = pgTable("income_sources", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgets.id),
  memberId: text("member_id").references(() => budgetMembers.id), // Quem recebe
  accountId: text("account_id").references(() => financialAccounts.id), // Onde cai

  name: text("name").notNull(), // "Salário João", "VR Maria"
  type: text("type").$type<IncomeType>().notNull(),
  amount: integer("amount").notNull(), // Em centavos

  // Recorrência
  frequency: text("frequency").$type<"monthly" | "biweekly" | "weekly">().default("monthly"),
  dayOfMonth: integer("day_of_month"), // Dia do pagamento (1-31)

  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Tela:** `/app/income/setup`
- Listar fontes de renda cadastradas
- Formulário para adicionar nova fonte
- Total de renda mensal esperada

---

## 2. Página Principal de Orçamento (Budget)

**Inspiração:** YNAB Budget View (imagem 2)

### 2.1 Layout da Página `/app/budget`

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀ Novembro 2024 ▶    │  R$ 5.000,00   │  ✓ Tudo Alocado      │
│                       │  Para Alocar   │                       │
├─────────────────────────────────────────────────────────────────┤
│  Filtros: [Todos] [Sub-financiadas] [Sobrando] [Com Saldo]     │
├───────────────────────────────────────┬─────────────────────────┤
│                                       │                         │
│  CATEGORIA              ALOCADO GASTO │  ⚡ Luz                  │
│                                       │  ─────────────────────  │
│  ▼ 📌 Essencial                       │  Saldo Disponível  R$ 0 │
│    🏠 Aluguel       R$ 1.500  R$ 0    │                         │
│    💡 Luz           R$ 200    R$ 150  │  Sobrou do Mês Passado  │
│    🛒 Mercado       R$ 800    R$ 320  │  Alocado Este Mês       │
│                                       │  Gastos                 │
│  ▼ 🎨 Estilo de Vida                  │                         │
│    🍔 iFood         R$ 300    R$ 180  │  ─────────────────────  │
│    📺 Streaming     R$ 80     R$ 80   │  Meta                   │
│                                       │  [Semanal] [Mensal] ... │
│  ▼ 🎉 Prazeres                        │                         │
│    João             R$ 200    R$ 50   │  Preciso de  R$ 200     │
│    Maria            R$ 200    R$ 100  │  Até  Fim do Mês     ▼  │
│                                       │                         │
│  ▼ 💰 Investimentos                   │  Próximo mês quero      │
│    Emergência       R$ 500    R$ 500  │  [Separar mais R$ 200]  │
│                                       │  [Usar como Refil]      │
└───────────────────────────────────────┴─────────────────────────┘
```

### 2.2 Componentes Principais

**BudgetHeader:**
- Navegação de mês (◀ ▶)
- Valor "Para Alocar" (receitas - alocações)
- Status de alocação

**CategoryRow:**
- Ícone + Nome da categoria
- Valor alocado (editável inline)
- Valor gasto no mês
- Saldo disponível
- Barra de progresso

**CategoryDetail (sidebar):**
- Detalhes da categoria selecionada
- Breakdown de valores
- Configuração de comportamento (set_aside vs refill_up)
- Histórico de gastos

### 2.3 Lógica de Comportamento

**Set Aside (Separar):**
- Valor não gasto acumula para o próximo mês
- Ideal para: contas, investimentos, metas
- Ex: Alocou R$ 200 para luz, gastou R$ 150, sobra R$ 50 para próximo mês

**Refill Up (Refil):**
- Valor "reseta" todo mês para o planejado
- Ideal para: alimentação fora, lazer, prazeres
- Ex: Alocou R$ 300 para iFood, gastou R$ 180, próximo mês começa com R$ 300 de novo

---

## 3. Nova Tabela: Alocações Mensais

**Objetivo:** Rastrear quanto foi alocado por categoria por mês.

```typescript
export const monthlyAllocations = pgTable("monthly_allocations", {
  id: text("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgets.id),
  categoryId: text("category_id").notNull().references(() => categories.id),

  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12

  allocated: integer("allocated").notNull().default(0), // Valor alocado em centavos
  carriedOver: integer("carried_over").notNull().default(0), // Valor que veio do mês anterior

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueAllocation: unique().on(table.budgetId, table.categoryId, table.year, table.month),
}));
```

---

## 4. Registro de Transações

### 4.1 Tela de Nova Transação `/app/transactions/new`

**Quick Add (similar ao YNAB):**
```
┌─────────────────────────────────────────┐
│  Nova Despesa                           │
├─────────────────────────────────────────┤
│  Valor        R$ [        ]             │
│  Conta        [Nubank           ▼]      │
│  Categoria    [🍔 iFood         ▼]      │
│  Data         [28/11/2024       📅]     │
│  Descrição    [                    ]    │
│  Quem pagou   [João             ▼]      │
│                                         │
│  ☐ Parcelado                            │
│    └─ Em [12] parcelas de R$ [83,33]    │
│                                         │
│  [Cancelar]              [💾 Salvar]    │
└─────────────────────────────────────────┘
```

### 4.2 Lista de Transações `/app/transactions`

- Filtros por: período, conta, categoria, membro
- Busca por descrição
- Agrupamento por dia
- Quick edit inline

---

## 5. Pagamento de Cartão de Crédito

**Fluxo Especial:**
1. Cartão acumula gastos (fatura)
2. No vencimento, criar transferência da conta corrente para o cartão
3. Zerar fatura do cartão

**Categoria Especial:** "Pagamento de Cartão"
- Categoria do grupo "Essencial"
- Valor = soma das faturas dos cartões
- Não conta como "gasto real" (já foi categorizado)

---

## 6. APIs Necessárias

```
# Categorias
GET    /api/app/categories
POST   /api/app/categories
PATCH  /api/app/categories/[id]
DELETE /api/app/categories/[id]
POST   /api/app/categories/reorder

# Grupos (read-only, seed data)
GET    /api/app/groups

# Alocações
GET    /api/app/budget/[year]/[month]
PATCH  /api/app/budget/[year]/[month]/allocate
POST   /api/app/budget/[year]/[month]/carry-over

# Fontes de Renda
GET    /api/app/income-sources
POST   /api/app/income-sources
PATCH  /api/app/income-sources/[id]
DELETE /api/app/income-sources/[id]

# Transações (expandir existente)
GET    /api/app/transactions
POST   /api/app/transactions
PATCH  /api/app/transactions/[id]
DELETE /api/app/transactions/[id]

# Dashboard
GET    /api/app/dashboard/summary
```

---

## 7. Ordem de Implementação

### Fase 1: Fundação (Schema + APIs básicas)
1. [ ] Criar tabela `income_sources`
2. [ ] Criar tabela `monthly_allocations`
3. [ ] Adicionar `paymentAccountId` em `financialAccounts`
4. [ ] Criar APIs de categorias (CRUD)
5. [ ] Criar APIs de grupos (GET)
6. [ ] Push schema no banco

### Fase 2: Setup de Categorias
7. [ ] Criar página `/app/categories/setup`
8. [ ] Componente de seleção de categorias sugeridas
9. [ ] Criar categorias padrão ao completar onboarding

### Fase 3: Configuração de Receitas
10. [ ] Criar página `/app/income/setup`
11. [ ] Formulário de fonte de renda
12. [ ] Vincular benefícios das contas

### Fase 4: Página de Orçamento
13. [ ] Criar página `/app/budget`
14. [ ] BudgetHeader com navegação de mês
15. [ ] Lista de categorias por grupo
16. [ ] Edição inline de alocação
17. [ ] Sidebar de detalhes da categoria
18. [ ] Toggle set_aside / refill_up

### Fase 5: Transações
19. [ ] Melhorar página `/app/transactions`
20. [ ] Modal/página de nova transação
21. [ ] Suporte a parcelamentos
22. [ ] Atualização automática de saldos

### Fase 6: Pagamento de Cartão
23. [ ] Vincular cartão à conta de pagamento
24. [ ] Criar categoria "Pagamento de Cartão"
25. [ ] Fluxo de pagamento de fatura

### Fase 7: Integração Telegram (futuro)
26. [ ] Bot para registro rápido de gastos
27. [ ] Notificações de orçamento

---

## 8. Considerações Técnicas

### Cálculos de Saldo

**Saldo Disponível da Categoria:**
```typescript
saldoDisponivel = carryOver + allocated - spent

// Para refill_up:
nextMonthCarryOver = 0

// Para set_aside:
nextMonthCarryOver = Math.max(0, saldoDisponivel)
```

**Para Alocar:**
```typescript
paraAlocar = totalReceitas - totalAlocado
```

**Gasto do Mês:**
```typescript
spent = sum(transactions.amount)
  .where(category = X AND month = Y AND type = 'expense')
```

### Performance

- Usar views materializadas ou cálculos em tempo de query
- Cache de saldos por categoria/mês
- Índices em: `transactions(budgetId, categoryId, date)`

---

## Próximos Passos

Após aprovação deste plano:
1. Implementar Fase 1 (Schema)
2. Implementar Fase 2 (Setup Categorias)
3. Iterar conforme feedback
