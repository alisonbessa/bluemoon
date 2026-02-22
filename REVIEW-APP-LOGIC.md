# Análise da Lógica Interna da Aplicação BlueMoon

## Resumo Executivo

A aplicação possui uma arquitetura financeira sólida com boas decisões de design (valores em centavos, batch inserts, lazy generation de transações). No entanto, foram identificados **problemas críticos de consistência de dados**, **gaps lógicos** e **oportunidades de melhoria** significativas.

---

## 1. PROBLEMAS CRÍTICOS (Bugs / Risco de Dados Inconsistentes)

### 1.1 Race Condition no Saldo das Contas

**Arquivos:** `src/app/api/app/transactions/route.ts`, `src/app/api/app/goals/[id]/contribute/route.ts`

O padrão usado para atualizar saldos é **read-then-write** sem lock:

```ts
// Problema: lê o saldo, calcula, e escreve — outro request pode ler no meio
const [account] = await tx.select().from(financialAccounts).where(...);
await tx.update(financialAccounts).set({
  balance: account.balance + balanceChange, // ← race condition
});
```

**Solução:** Usar `SET balance = balance + $1` diretamente no SQL, ou usar `SELECT ... FOR UPDATE`:

```ts
// Opção 1: Incremento atômico (recomendado)
await tx.update(financialAccounts)
  .set({ balance: sql`${financialAccounts.balance} + ${balanceChange}` })
  .where(eq(financialAccounts.id, accountId));

// Opção 2: SELECT FOR UPDATE
const [account] = await tx.execute(
  sql`SELECT * FROM financial_accounts WHERE id = ${accountId} FOR UPDATE`
);
```

### 1.2 Criação de Parcelas Fora de Transação Atômica

**Arquivo:** `src/app/api/app/transactions/route.ts:127-216`

Quando `isInstallment === true`, a criação das parcelas e atualização de saldo **NÃO está dentro de uma `db.transaction()`**. Se o insert das parcelas filhas falhar, o parent já foi inserido e o saldo pode ficar inconsistente.

```ts
// Linhas 155-196: inserts sem db.transaction()
const [parentTransaction] = await db.insert(transactions).values({...}).returning();
const remainingInstallments = await db.insert(transactions).values(installmentValues).returning();
// Se falhar aqui, parent existe mas filhas não

await db.update(financialAccounts).set({
  balance: currentAccount.balance + balanceChange,
});
// Se falhar aqui, transações existem mas saldo não foi atualizado
```

**Solução:** Envolver todo o bloco de parcelas em `db.transaction()`.

### 1.3 Contribuição para Meta Sem Transação Atômica

**Arquivo:** `src/app/api/app/goals/[id]/contribute/route.ts:97-172`

A contribuição para meta envolve 5 operações separadas (criar transação, debitar conta origem, creditar conta destino, criar contribuição, atualizar meta), mas **nenhuma está dentro de `db.transaction()`**. Se qualquer operação falhar no meio, os dados ficam inconsistentes.

**Solução:** Envolver todas as operações em `db.transaction()`.

### 1.4 Transações Pendentes Geradas Sem Atualizar Saldo

**Arquivo:** `src/shared/lib/budget/pending-transactions.ts:287-289`

Transações geradas automaticamente (recurring bills e income) são inseridas sem atualizar o saldo das contas. Isso cria uma inconsistência: o saldo da conta não reflete as transações pendentes.

```ts
// Insere transações mas nunca atualiza saldo
if (allTransactions.length > 0) {
  await db.insert(transactions).values(allTransactions);
}
```

**Decisão necessária:** Ou (a) transações pendentes não afetam saldo (e o saldo é apenas "confirmado"), ou (b) elas devem afetar. Atualmente, o POST de transações normais **sempre** atualiza o saldo mesmo para `status: "pending"`, criando inconsistência com as transações auto-geradas.

### 1.5 Tipo `amount` inconsistente entre `integer` e `bigint`

**Arquivos:** Vários schemas

- `financialAccounts.balance`: **bigint** (suporta até ~9.2 quadrilhões)
- `transactions.amount`: **integer** (suporta até ~2.1 bilhões = R$ 21 milhões)
- `goals.targetAmount`: **integer**
- `goals.currentAmount`: **integer**
- `monthlyAllocations.allocated`: **integer**

Se uma conta tem saldo em bigint mas transações são integer, somas de muitas transações podem ultrapassar o range do integer. Mais importante: para metas de longo prazo (ex: comprar imóvel), R$ 21M pode não ser suficiente.

**Solução:** Padronizar tudo como `bigint` ou pelo menos usar `bigint` para `goals.targetAmount` e `goals.currentAmount`.

---

## 2. PROBLEMAS LÓGICOS (Comportamento Incorreto/Incompleto)

### 2.1 Carry-Over Recalculado em Cada Request

**Arquivo:** `src/app/api/app/allocations/route.ts:118-193`

O carry-over do mês anterior é recalculado **em cada GET request**. Isso tem dois problemas:

1. **Performance:** Cada request faz queries ao mês anterior desnecessariamente
2. **Mutabilidade:** Se transações do mês anterior forem editadas após o mês ser "fechado", o carry-over do mês atual muda retroativamente

**Solução:** O carry-over deveria ser calculado **uma vez** quando o mês é iniciado (transição `planning → active`) e "congelado" no registro de `monthlyAllocations`. O status `closed` deveria impedir alterações no mês anterior.

### 2.2 Status do Mês (`monthlyBudgetStatus`) Não é Enforçado

O schema define 3 estados (`planning`, `active`, `closed`), mas:

- **Não existe API para transicionar** entre estados (não encontrei um endpoint para "iniciar mês" ou "fechar mês")
- **Nenhuma rota verifica o status do mês** antes de permitir operações — é possível criar transações, editar alocações, etc., em um mês "fechado"
- O `ensurePendingTransactionsForMonth` gera transações independentemente do status

**Solução:** Implementar endpoints de transição e validar o status em todas as operações de escrita.

### 2.3 `clearedBalance` Nunca é Atualizado

**Arquivo:** `src/db/schema/accounts.ts:32`

O campo `clearedBalance` existe no schema mas **nenhuma rota o atualiza**. Todas as operações (criar, editar, deletar transação) atualizam apenas `balance`.

**Solução:** Atualizar `clearedBalance` quando o status da transação muda para `cleared` ou `reconciled`.

### 2.4 Deleção de Parcela Filha Não Reverte Saldo Corretamente

**Arquivo:** `src/app/api/app/transactions/[id]/route.ts:227-325`

Quando se deleta uma parcela filha (não-parent), a lógica de reversão de saldo assume que é uma transação simples. Mas para cartões de crédito, o valor total já foi debitado na criação. Deletar uma parcela filha individual deveria reverter apenas o valor daquela parcela no saldo.

```ts
// Linha 265-276: Só calcula total para parent + children quando é parent
// Se deletar uma child de cartão de crédito, reverte amount da child
// mas o saldo total do cartão já foi debitado por TODAS as parcelas na criação
```

**Solução:** Para cartões de crédito, ao deletar uma parcela filha individual, reverter o valor da parcela no saldo. E ao deletar o parent, reverter o total de todas (que já é feito).

### 2.5 Transferências em Parcelas Não São Tratadas

**Arquivo:** `src/app/api/app/transactions/route.ts:127-216`

O bloco de criação de parcelas não trata `toAccountId` para transferências parceladas. Se alguém criar uma transferência parcelada, a conta destino nunca recebe os valores.

### 2.6 Categoria "set_aside" vs "refill_up" — Comportamento Incompleto

O schema define dois comportamentos mas a lógica de alocação não diferencia completamente:

- **set_aside:** O carry-over funciona (sobra vai para o próximo mês)
- **refill_up:** Deveria "resetar" para o valor alocado a cada mês, sem acumular sobra

Atualmente, o carry-over é calculado para **todas** as categorias com alocação anterior, sem verificar o `behavior`. Categorias `refill_up` não deveriam ter carry-over.

**Arquivo:** `src/app/api/app/allocations/route.ts:156-161` — falta verificar `category.behavior`.

---

## 3. MELHORIAS ARQUITETURAIS

### 3.1 Separar Lógica de Negócio das Rotas API

Atualmente, toda a lógica de negócio está nas rotas API (`/api/app/...`). Isso dificulta:

- Reutilização (ex: a mesma lógica de saldo é duplicada em 4 rotas)
- Testabilidade unitária
- Manutenção

**Recomendação:** Criar uma camada de serviço:

```
src/
  services/
    transaction.service.ts  → createTransaction, updateTransaction, deleteTransaction
    account.service.ts      → updateBalance, calculateBill
    goal.service.ts         → contribute, calculateMetrics
    allocation.service.ts   → carryOver, copyAllocations
    budget.service.ts       → startMonth, closeMonth
```

### 3.2 Duplicação de `calculateGoalMetrics`

**Arquivos:** `src/app/api/app/goals/route.ts:16-42` e `src/app/api/app/goals/[id]/contribute/route.ts:21-48`

A mesma função é copiada em dois arquivos. Deveria estar em um módulo compartilhado.

### 3.3 Falta de Paginação no GET de Alocações

O endpoint de alocações (`/api/app/allocations`) retorna **todas** as categorias com seus cálculos de uma vez. Para budgets com muitas categorias, isso pode ser lento. Considerar paginação ou lazy loading por grupo.

### 3.4 N+1 Query no Cálculo de Fatura de Cartão

**Arquivo:** `src/app/api/app/accounts/route.ts:82-105`

Para cada cartão de crédito, faz uma query separada. Com muitos cartões, isso é um N+1:

```ts
const accountsWithBill = await Promise.all(
  userAccounts.map(async (account) => {
    // Uma query por cartão de crédito
    const [result] = await db.select({ total: ... }).from(transactions).where(...);
  })
);
```

**Solução:** Uma única query agrupada:

```ts
const bills = await db
  .select({
    accountId: transactions.accountId,
    total: sql`SUM(${transactions.amount})`,
  })
  .from(transactions)
  .where(/* cartões de crédito + billing cycle */)
  .groupBy(transactions.accountId);
```

### 3.5 Falta Índice Composto para Billing Cycle

Queries frequentes filtram por `accountId + type + status + date`. O índice `idx_transactions_budget_type_date` não ajuda nesse caso. Seria útil:

```ts
index("idx_transactions_account_type_status_date")
  .on(table.accountId, table.type, table.status, table.date)
```

---

## 4. MELHORIAS DE MODELO DE DADOS

### 4.1 Adicionar `currency` ao Budget

Não há suporte a diferentes moedas. Se no futuro o app tiver usuários internacionais, adicionar `currency` ao budget seria importante.

### 4.2 Adicionar Histórico de Alterações de Saldo (Audit Log)

Atualmente, se o saldo ficar inconsistente, não há como rastrear o que aconteceu. Um `balance_audit_log` com (accountId, previousBalance, newBalance, transactionId, timestamp) permitiria debugar e reconciliar.

### 4.3 Adicionar `startDate` nas Recurring Bills

Não há campo para indicar **quando** uma conta recorrente começou. Isso significa que se um usuário criar uma conta recorrente hoje, ao navegar para meses anteriores, transações serão geradas retroativamente (pelo `ensurePendingTransactionsForMonth`).

**Solução:** Adicionar `startDate` e `endDate` à tabela `recurringBills` e verificar no lazy generation.

### 4.4 Goals: Adicionar Suporte a "Saques" (Withdrawal)

O sistema de metas só permite contribuições. Não há lógica para retirar dinheiro de uma meta (ex: emergência que force sacar da meta). Seria bom ter um endpoint de "withdrawal" que faça o inverso do contribute.

### 4.5 Subcategorias

O modelo atual é flat (grupo → categoria). Para budgets mais detalhados, considerar subcategorias opcionais (ex: "Alimentação" → "Mercado", "Restaurante", "Delivery").

---

## 5. MELHORIAS DE SEGURANÇA E VALIDAÇÃO

### 5.1 Validar que `accountId` Pertence ao Budget

**Arquivo:** `src/app/api/app/transactions/route.ts`

Na criação de transação, valida-se que o `budgetId` pertence ao usuário, mas **não se valida** que o `accountId` pertence àquele budget. Um usuário poderia enviar um `accountId` de outro budget.

```ts
// Falta: verificar que accountId pertence ao budgetId
if (type === "transfer" && !toAccountId) {
  return errorResponse("Transfer requires toAccountId", 400);
}
// Deveria também verificar:
// - accountId pertence ao budgetId
// - toAccountId pertence ao budgetId
// - categoryId pertence ao budgetId
```

### 5.2 Limitar Acesso por `memberId`

Transações aceitam qualquer `memberId` sem verificar se o membro pertence ao budget. O mesmo vale para categorias com `memberId`.

### 5.3 Proteger Contra Saldo Negativo em Contas Não-Crédito

Nenhuma validação impede que uma conta corrente ou poupança fique com saldo negativo. Para cartões de crédito faz sentido (é o comportamento esperado), mas para contas de débito, deveria haver pelo menos um aviso.

---

## 6. QUADRO RESUMO DE PRIORIDADES

| # | Problema | Severidade | Esforço |
|---|---------|-----------|---------|
| 1.1 | Race condition no saldo | **Crítico** | Baixo |
| 1.2 | Parcelas fora de transação atômica | **Crítico** | Baixo |
| 1.3 | Contribuição meta sem atomicidade | **Crítico** | Baixo |
| 1.4 | Pending transactions não afetam saldo | **Alto** | Médio |
| 1.5 | Tipos integer vs bigint inconsistentes | **Médio** | Médio |
| 2.1 | Carry-over recalculado em cada request | **Alto** | Médio |
| 2.2 | Status do mês não enforçado | **Alto** | Alto |
| 2.3 | clearedBalance nunca atualizado | **Médio** | Baixo |
| 2.4 | Deleção de parcela filha (CC) | **Médio** | Médio |
| 2.5 | Transfer em parcelas | **Médio** | Médio |
| 2.6 | set_aside vs refill_up incompleto | **Alto** | Baixo |
| 3.1 | Separar lógica de negócio | **Médio** | Alto |
| 3.2 | Duplicação calculateGoalMetrics | **Baixo** | Baixo |
| 3.4 | N+1 query faturas cartão | **Médio** | Baixo |
| 4.3 | startDate em recurring bills | **Médio** | Baixo |
| 5.1 | Validar accountId pertence ao budget | **Alto** | Baixo |
| 5.2 | Validar memberId pertence ao budget | **Alto** | Baixo |

---

## 7. O QUE ESTÁ BEM FEITO

- **Valores em centavos (integer):** Evita problemas de floating point. Boa decisão.
- **Batch insert de parcelas:** Performance excelente vs inserts individuais.
- **Lazy generation de transações:** Padrão idempotente inteligente, evita cron jobs.
- **Billing cycle bem implementado:** A lógica de ciclo de faturamento está correta e cobre edge cases (meses com menos dias, virada de ano).
- **Composite indexes:** Bons índices para os padrões de query mais comuns.
- **Promise.all para queries paralelas:** Boa otimização no endpoint de alocações.
- **Zod validation:** Input validation consistente em todos os endpoints.
- **Permissões de budget:** Modelo de acesso multi-usuário bem pensado.
- **Grupos pré-definidos:** Estrutura de grupos fixos (essencial, lifestyle, pleasures, investments, goals) é uma boa UX que guia o usuário sem restringir.
