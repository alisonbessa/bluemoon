# Arquitetura do Projeto - Bluemoon/Hive Budget

Este documento define a arquitetura FSD Adaptada do projeto. Siga estas convenções ao criar ou modificar código.

---

## Estrutura de Diretórios

```
src/
├── features/                    # Feature modules (business logic)
│   └── [feature]/
│       ├── ui/                  # Componentes de UI da feature
│       │   ├── [feature]-*.tsx
│       │   └── index.ts
│       ├── hooks/               # Hooks específicos da feature
│       │   ├── use-[feature]-*.ts
│       │   └── index.ts
│       ├── types.ts             # Tipos de UI/form da feature
│       └── index.ts             # Barrel exports
│
├── shared/                      # Código compartilhado entre features
│   ├── ui/                      # shadcn components (atoms)
│   ├── molecules/               # Padrões reutilizáveis
│   ├── organisms/               # Composições complexas
│   ├── layout/                  # Layout components (sidebar, header)
│   ├── hooks/                   # Hooks globais
│   │   ├── data/               # SWR hooks para fetching
│   │   └── index.ts
│   └── lib/                     # Utilities, formatters, config
│
├── integrations/                # Integrações externas
│   ├── stripe/
│   ├── telegram/
│   └── uploadthing/
│
├── app/                         # Next.js App Router (pages)
├── types/                       # Tipos de domínio
├── services/                    # API services
└── db/                          # Database schema (Drizzle)
```

---

## Path Aliases

```typescript
// tsconfig.json paths
"@/features/*"      → "./src/features/*"
"@/shared/*"        → "./src/shared/*"
"@/integrations/*"  → "./src/integrations/*"
"@/*"               → "./src/*"
```

---

## Padrões de Import

### Correto
```typescript
// Shared components
import { Button } from "@/shared/ui/button";
import { SummaryCard, EmptyState } from "@/shared/molecules";
import { cn } from "@/shared/lib/utils";

// Feature imports
import { TransactionWidget, useTransactionData } from "@/features/transactions";

// Tipos de domínio
import type { AccountType } from "@/types/account";

// Hooks de dados globais
import { useAccounts } from "@/shared/hooks/data/use-accounts";
```

### Incorreto
```typescript
// ❌ Nunca use caminhos antigos
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks";
import { cn } from "@/lib/utils";
```

---

## Estrutura de Feature Module

Cada feature segue este padrão:

```
features/[feature]/
├── ui/
│   ├── [feature]-list.tsx           # Lista/tabela principal
│   ├── [feature]-form-modal.tsx     # Modal de criação/edição
│   ├── [feature]-delete-dialog.tsx  # Confirmação de exclusão
│   ├── [feature]-summary.tsx        # Cards de resumo (se aplicável)
│   ├── [feature]-filters-*.tsx      # Componentes de filtro
│   └── index.ts                     # Re-exporta todos os componentes
│
├── hooks/
│   ├── use-[feature]-data.ts        # Fetching + período + refresh
│   ├── use-[feature]-filters.ts     # Estado de filtros
│   ├── use-[feature]-form.ts        # Estado do formulário CRUD
│   └── index.ts
│
├── types.ts                         # Tipos específicos de UI/form
└── index.ts                         # Barrel exports de tudo
```

### Exemplo de index.ts principal
```typescript
/**
 * [Feature] Feature Module
 */

// Types
export * from "./types";

// Hooks
export * from "./hooks";

// UI Components
export * from "./ui";
```

---

## Convenções de Nomenclatura

### Arquivos
- Componentes: `kebab-case.tsx` (ex: `transaction-form-modal.tsx`)
- Hooks: `use-kebab-case.ts` (ex: `use-transaction-data.ts`)
- Types: `types.ts` (um por feature)
- Barrel exports: `index.ts`

### Componentes
- PascalCase: `TransactionFormModal`, `AccountCard`
- Prefixados com nome da feature: `Transaction*`, `Account*`

### Hooks
- camelCase com prefixo `use`: `useTransactionData`, `useAccountForm`
- Hooks de feature: `use[Feature][Purpose]`

### Types
- Interfaces: PascalCase (`Transaction`, `AccountFormData`)
- Types de filtro: `[Feature]Filter` (`TypeFilter`, `CategoryFilter`)

---

## Shared Components

### Molecules (padrões reutilizáveis)
```
shared/molecules/
├── delete-confirm-dialog.tsx   # Dialog de confirmação genérico
├── empty-state.tsx             # Estado vazio com ícone e ação
├── form-modal-wrapper.tsx      # Wrapper para modais de form
├── loading-state.tsx           # Spinner com texto opcional
├── page-header.tsx             # Header de página com título
├── responsive-button.tsx       # Botão que se adapta ao mobile
├── summary-card.tsx            # Card de resumo com valor
└── index.ts
```

### Uso
```typescript
import {
  EmptyState,
  PageHeader,
  LoadingState,
  FormModalWrapper
} from "@/shared/molecules";
```

---

## Hooks de Dados (SWR)

Todos os hooks de fetching ficam em `shared/hooks/data/`:

```
shared/hooks/data/
├── use-accounts.ts
├── use-budgets.ts
├── use-categories.ts
├── use-goals.ts
├── use-income-sources.ts
├── use-recurring-bills.ts
└── index.ts
```

### Padrão de uso
```typescript
import { useAccounts, useCategories } from "@/shared/hooks/data";

function MyComponent() {
  const { accounts, isLoading } = useAccounts(budgetId);
  const { categories } = useCategories(budgetId);
}
```

---

## Criando uma Nova Feature

### 1. Criar estrutura de pastas
```bash
mkdir -p src/features/[feature]/ui src/features/[feature]/hooks
```

### 2. Criar types.ts
```typescript
// src/features/[feature]/types.ts

export interface [Feature] {
  id: string;
  // ... campos
}

export interface [Feature]FormData {
  // ... campos do form
}

export const initial[Feature]FormData: [Feature]FormData = {
  // ... valores iniciais
};
```

### 3. Criar hooks
```typescript
// src/features/[feature]/hooks/use-[feature]-data.ts
export function use[Feature]Data() {
  // Fetching, período, refresh
}

// src/features/[feature]/hooks/use-[feature]-form.ts
export function use[Feature]Form() {
  // Estado do form, validação, submit
}

// src/features/[feature]/hooks/index.ts
export { use[Feature]Data } from "./use-[feature]-data";
export { use[Feature]Form } from "./use-[feature]-form";
```

### 4. Criar componentes de UI
```typescript
// src/features/[feature]/ui/[feature]-form-modal.tsx
// src/features/[feature]/ui/[feature]-list.tsx
// etc.

// src/features/[feature]/ui/index.ts
export { [Feature]FormModal } from "./[feature]-form-modal";
export { [Feature]List } from "./[feature]-list";
```

### 5. Criar barrel export principal
```typescript
// src/features/[feature]/index.ts
export * from "./types";
export * from "./hooks";
export * from "./ui";
```

### 6. Usar na página
```typescript
// src/app/(in-app)/app/[feature]/page.tsx
import {
  [Feature]List,
  [Feature]FormModal,
  use[Feature]Data,
  use[Feature]Form,
  type [Feature],
} from "@/features/[feature]";
```

---

## Features Existentes

| Feature | Status | Localização |
|---------|--------|-------------|
| transactions | ✅ Migrado | `features/transactions/` |
| accounts | 🔄 Pendente | `components/accounts/` |
| budget | 🔄 Pendente | `components/budget/` |
| categories | 🔄 Pendente | `components/categories/` |
| income | 🔄 Pendente | `components/income/` |
| goals | 🔄 Pendente | `components/goals/` |
| dashboard | 🔄 Pendente | `components/dashboard/` |

---

## Regras Importantes

1. **Nunca importe de `@/components/ui`** - Use `@/shared/ui`
2. **Nunca importe de `@/lib`** - Use `@/shared/lib`
3. **Nunca importe de `@/hooks`** - Use `@/shared/hooks`
4. **Features não podem importar de outras features diretamente**
   - Se precisar compartilhar, mova para `shared/`
5. **Tipos de domínio ficam em `@/types`**
   - Tipos de UI/form ficam em `features/[feature]/types.ts`
6. **Sempre crie barrel exports (index.ts)**
7. **Componentes de UI de feature ficam em `ui/` subfolder**
8. **Hooks de feature ficam em `hooks/` subfolder**

---

## Migração de Componentes Legados

Ao migrar componentes de `components/` para `features/`:

1. Crie a estrutura FSD completa
2. Mova os arquivos para as pastas corretas
3. Atualize imports internos (`./types` → `../types`)
4. Atualize imports nos consumidores
5. Delete a pasta antiga em `components/`
6. Rode `npm run build` para verificar
