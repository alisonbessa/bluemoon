# Planejamento Completo: Sistema de Orcamentos Compartilhados

## Visao Geral

Sistema que permite casais/familias compartilharem um orcamento, com opcao de privacidade por categoria. Todos os membros adultos tem os mesmos direitos - sem hierarquia de admin.

---

## Parte 1: Convites e Membros

### Fluxo de Convite

```
Usuario A (dono do budget)
    |
    v
[Configuracoes] -> [Convidar Membro]
    |
    v
Gera link de convite (token unico, expira em 7 dias)
    |
    v
Usuario B acessa link
    |
    v
[Ja tem conta?]
   |     |
  Sim   Nao
   |     |
   v     v
Login  Cadastro
   |     |
   +--+--+
      |
      v
Aceita convite -> Vira membro do budget
```

### Schema: Convites

```typescript
// Nova tabela
export const budgetInvites = pgTable("budget_invites", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  budgetId: text("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  invitedByMemberId: text("invited_by_member_id").notNull().references(() => budgetMembers.id),
  token: text("token").notNull().unique(), // UUID para o link
  email: text("email"), // Opcional - para convite direcionado
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { mode: "date" }),
  usedByUserId: text("used_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});
```

### API de Convites

```
POST /api/app/budgets/[id]/invites
  - Gera novo convite
  - Retorna: { token, inviteUrl, expiresAt }

GET /api/app/invites/[token]
  - Valida token
  - Retorna info do budget (nome) para preview

POST /api/app/invites/[token]/accept
  - Aceita convite
  - Cria budgetMember para o usuario logado
  - Marca convite como usado

DELETE /api/app/budgets/[id]/invites/[inviteId]
  - Cancela convite pendente
```

### UI de Convites

**Pagina de Configuracoes do Budget:**
```
+--------------------------------------------------+
| Membros do Orcamento                             |
+--------------------------------------------------+
| Joao Silva (voce)              joao@email.com    |
| Maria Santos                   maria@email.com   |
+--------------------------------------------------+
| [+ Convidar Membro]                              |
+--------------------------------------------------+
| Convites Pendentes                               |
| - Enviado em 01/12 (expira em 6 dias) [Cancelar] |
+--------------------------------------------------+
```

**Modal de Convite:**
```
+------------------------------------------+
| Convidar para o Orcamento                |
+------------------------------------------+
| Compartilhe este link:                   |
| [https://app.com/invite/abc123] [Copiar] |
|                                          |
| Expira em: 7 dias                        |
|                                          |
| Ou envie por email (opcional):           |
| [_______________________] [Enviar]       |
+------------------------------------------+
```

**Pagina de Aceitar Convite (/invite/[token]):**
```
+------------------------------------------+
| Voce foi convidado!                      |
+------------------------------------------+
| Joao Silva te convidou para              |
| compartilhar o orcamento:                |
|                                          |
|        "Orcamento Familiar"              |
|                                          |
| [Aceitar Convite]                        |
|                                          |
| Ao aceitar, voce tera acesso completo    |
| ao orcamento compartilhado.              |
+------------------------------------------+
```

---

## Parte 2: Privacidade por Categoria

### Conceito

- **Categoria compartilhada** (memberId = null): Todos veem
- **Categoria pessoal** (memberId = X): So X ve

Cada pessoa ve:
1. Categorias compartilhadas e seus gastos
2. Suas proprias categorias pessoais
3. NAO ve categorias pessoais de outros

### Schema: Privacidade

```typescript
// Modificar tabela budgets
export const budgets = pgTable("budgets", {
  // ... campos existentes ...

  // NOVO
  allowPrivacy: boolean("allow_privacy").default(false),
});

// categories ja tem o campo necessario:
// memberId: text("member_id").references(() => budgetMembers.id)
```

### Regras de Visibilidade

```typescript
function canSeeCategory(category, currentMemberId, budget) {
  // Privacidade desabilitada = ve tudo
  if (!budget.allowPrivacy) return true;

  // Categoria compartilhada = todos veem
  if (!category.memberId) return true;

  // Categoria pessoal = so dono ve
  return category.memberId === currentMemberId;
}

// Transacoes herdam visibilidade da categoria
function canSeeTransaction(tx, currentMemberId, budget, category) {
  return canSeeCategory(category, currentMemberId, budget);
}
```

### UI de Privacidade

**Toggle nas Configuracoes do Budget:**
```
+------------------------------------------+
| Privacidade                              |
+------------------------------------------+
| [ ] Permitir categorias privadas         |
|     Membros podem criar categorias       |
|     visiveis apenas para si              |
+------------------------------------------+
```

**Criar/Editar Categoria (quando allowPrivacy = true):**
```
+------------------------------------------+
| Nova Categoria                           |
+------------------------------------------+
| Nome: [________________]                 |
| Grupo: [Despesas Variaveis v]            |
|                                          |
| [x] Categoria privada                    |
|     Apenas voce vera os gastos           |
+------------------------------------------+
```

---

## Parte 3: Multiplos Orcamentos

### Conceito

Um usuario pode participar de varios orcamentos:
- Orcamento pessoal (so ele)
- Orcamento do casal (ele + parceiro)
- Orcamento da familia (ele + parceiro + filhos)

### Schema: Selecao de Budget

```typescript
// Modificar tabela users
export const users = pgTable("users", {
  // ... campos existentes ...

  // NOVO - ultimo budget acessado
  lastBudgetId: text("last_budget_id").references(() => budgets.id),
});
```

### UI de Selecao

**Seletor no Header (quando tem mais de 1 budget):**
```
+------------------------------------------+
| [Orcamento Familiar v]  Dashboard  ...   |
+------------------------------------------+
     |
     v
+---------------------------+
| Seus Orcamentos           |
+---------------------------+
| > Orcamento Familiar      |
|   Orcamento Pessoal       |
+---------------------------+
| + Criar novo orcamento    |
+---------------------------+
```

**Pagina de Orcamentos (/app/budgets):**
```
+------------------------------------------+
| Seus Orcamentos                          |
+------------------------------------------+
| +------------------------------------+   |
| | Orcamento Familiar                 |   |
| | 2 membros - Voce, Maria            |   |
| | [Acessar]                          |   |
| +------------------------------------+   |
|                                          |
| +------------------------------------+   |
| | Orcamento Pessoal                  |   |
| | 1 membro - Voce                    |   |
| | [Acessar]                          |   |
| +------------------------------------+   |
|                                          |
| [+ Criar Novo Orcamento]                 |
+------------------------------------------+
```

---

## Parte 4: Permissoes de Membro

### Modelo Simplificado (v1)

Todos os membros adultos tem os mesmos direitos:
- Ver tudo (exceto categorias privadas de outros)
- Criar/editar/deletar categorias
- Criar/editar/deletar transacoes
- Convidar novos membros
- Alterar configuracoes do budget

### Modelo Futuro (v2+)

```typescript
// Para v2 - adicionar tipos de membro
memberType: text("member_type").$type<"adult" | "child">().default("adult"),

// Criancas:
// - Veem menos informacoes
// - Nao podem convidar
// - Nao podem alterar configuracoes
```

---

## Ordem de Implementacao

### Fase 1: Convites (Prioridade Alta)
1. [ ] Criar schema `budgetInvites`
2. [ ] API POST /budgets/[id]/invites - gerar convite
3. [ ] API GET /invites/[token] - validar convite
4. [ ] API POST /invites/[token]/accept - aceitar convite
5. [ ] Pagina /invite/[token] - aceitar convite
6. [ ] UI de convite nas configuracoes do budget
7. [ ] Email de convite (opcional)

### Fase 2: Multiplos Budgets
1. [ ] Adicionar `lastBudgetId` na tabela users
2. [ ] Seletor de budget no header
3. [ ] Pagina /app/budgets para listar
4. [ ] Criar novo budget
5. [ ] Context de budget ativo

### Fase 3: Privacidade por Categoria
1. [ ] Adicionar `allowPrivacy` na tabela budgets
2. [ ] Toggle nas configuracoes do budget
3. [ ] Filtrar categorias baseado em memberId + allowPrivacy
4. [ ] Filtrar transacoes baseado na categoria
5. [ ] Toggle "privada" no form de categoria
6. [ ] Indicador visual de categoria privada

### Fase 4: Ajustes e Integracao
1. [ ] Dashboard respeita privacidade
2. [ ] Planejamento respeita privacidade
3. [ ] Telegram respeita privacidade
4. [ ] Metas compartilhadas vs pessoais
5. [ ] Testes de regressao

---

## Exemplos de Uso

### Cenario 1: Casal Transparente
Joao e Maria compartilham tudo.
- allowPrivacy = false
- Ambos veem todas as categorias e gastos
- Simples e transparente

### Cenario 2: Casal com Privacidade
Joao e Maria querem privacidade em alguns gastos.
- allowPrivacy = true
- Joao cria "Jogos" (privada) - Maria nao ve
- Maria cria "Beleza" (privada) - Joao nao ve
- "Alimentacao", "Moradia" - ambos veem

### Cenario 3: Presente Surpresa
Maria quer comprar presente para Joao:
1. Cria categoria "Presentes" (privada)
2. Registra gasto do presente
3. Joao nao ve categoria nem transacao
4. Apos aniversario, pode desmarcar como privada

### Cenario 4: Familia com Filhos (v2)
Pais + 2 filhos adolescentes:
- Pais: acesso completo
- Filhos: veem mesada e categorias basicas
- Nao veem salarios, investimentos, etc.

---

## Decisoes Tecnicas

1. **Privacidade por categoria (nao por transacao)**
   - Mais simples de implementar
   - Usa campo existente `memberId`
   - Intuitivo: "minha categoria = meus gastos"

2. **Sem hierarquia admin (v1)**
   - Casal = parceiros iguais
   - Evita conflitos de "quem manda"
   - Pode evoluir para v2 com tipos

3. **Convite por link (nao por email)**
   - Mais flexivel
   - Funciona mesmo sem email configurado
   - Email e opcional/complementar

4. **Budget como unidade principal**
   - Tudo pertence a um budget
   - Usuario pode ter multiplos budgets
   - Contexto sempre tem budget ativo

---

## Arquivos a Criar/Modificar

### Novos Arquivos
```
src/db/schema/budget-invites.ts
src/app/api/app/budgets/[id]/invites/route.ts
src/app/api/app/invites/[token]/route.ts
src/app/api/app/invites/[token]/accept/route.ts
src/app/(public)/invite/[token]/page.tsx
src/app/(in-app)/app/budgets/page.tsx
src/components/budget/budget-selector.tsx
src/components/budget/invite-modal.tsx
src/components/budget/members-list.tsx
```

### Arquivos a Modificar
```
src/db/schema/budgets.ts          # allowPrivacy
src/db/schema/users.ts            # lastBudgetId
src/db/schema/index.ts            # exports
src/components/layout/app-header.tsx  # seletor de budget
src/app/api/app/categories/route.ts   # filtro de privacidade
src/app/api/app/transactions/route.ts # filtro de privacidade
src/app/(in-app)/app/budget/page.tsx  # privacidade
```

---

*Ultima atualizacao: Dezembro 2025*
