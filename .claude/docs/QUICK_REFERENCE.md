# Quick Reference - Arquitetura FSD

## Imports Corretos

```typescript
// UI Components (shadcn)
import { Button, Input, Dialog } from "@/shared/ui/[component]";

// Molecules (padrões reutilizáveis)
import { EmptyState, PageHeader, LoadingState } from "@/shared/molecules";

// Organisms
import { SummaryCardGrid } from "@/shared/organisms";

// Layout
import { AppSidebar, Header } from "@/shared/layout";

// Hooks globais
import { useAccounts, useCategories } from "@/shared/hooks/data";
import { useDebounce, useMobile } from "@/shared/hooks";

// Utilities
import { cn, formatCurrency } from "@/shared/lib/utils";
import { formatCurrencyFromDigits } from "@/shared/lib/formatters";

// Features
import { TransactionWidget, useTransactionData } from "@/features/transactions";

// Tipos de domínio
import type { AccountType } from "@/types/account";
```

## Estrutura de Feature

```
features/[feature]/
├── ui/           # Componentes de UI
├── hooks/        # Hooks da feature
├── types.ts      # Tipos de UI/form
└── index.ts      # Barrel exports
```

## Ao Criar Código Novo

1. **Novo componente de UI para feature existente** → `features/[feature]/ui/`
2. **Novo hook para feature existente** → `features/[feature]/hooks/`
3. **Componente reutilizável** → `shared/molecules/` ou `shared/organisms/`
4. **Novo hook global** → `shared/hooks/` ou `shared/hooks/data/`

## Documentação Completa

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para detalhes completos.
