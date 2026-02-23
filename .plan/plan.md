# Plano de Implementação: Insights/Relatórios + Empty State Cartões

## 1. Fix: Card de Cartões de Crédito com Empty State

**Problema**: Em `src/app/(in-app)/app/page.tsx:267`, o card de cartão só renderiza se `creditCards.length > 0`. Sem cartões, simplesmente não aparece.

**Solução**:
- Modificar `CreditCardSpending` para mostrar empty state quando `creditCards.length === 0`
- Remover a condicional `{creditCards.length > 0 && ...}` no dashboard
- Empty state com ícone, texto "Nenhum cartão cadastrado" e botão "Cadastrar cartão" linkando para `/app/accounts`

**Arquivos**:
- `src/features/dashboard/ui/credit-card-spending.tsx` - Adicionar empty state
- `src/app/(in-app)/app/page.tsx` - Remover condicional `creditCards.length > 0`

---

## 2. Feature: Página de Relatórios/Insights

### 2a. API Backend - `/api/app/dashboard/insights`

Endpoint que retorna dados consolidados para o mês selecionado:

**Insights do mês corrente:**
- % do orçamento já gasto vs % do mês decorrido (saúde do orçamento)
- Top 5 categorias com maior gasto
- Categorias que excederam o planejado
- Comparação receita vs despesa do mês
- Economia do mês (receitas - despesas)
- Gasto médio diário e projeção para o fim do mês

**Insights de meses fechados:**
- Os mesmos dados acima, porém com dados finais
- Comparação com o mês anterior (variação %)

**Arquivo**: `src/app/api/app/dashboard/insights/route.ts`

### 2b. Feature module - `/features/insights`

- `src/features/insights/types.ts` - Tipos do insight
- `src/features/insights/hooks/use-insights-data.ts` - Hook SWR para buscar dados
- `src/features/insights/ui/insights-cards.tsx` - Cards de insights (budget health, projeção, economia)
- `src/features/insights/ui/top-categories.tsx` - Lista das top categorias
- `src/features/insights/ui/month-comparison.tsx` - Comparação com mês anterior
- `src/features/insights/index.ts` - Barrel export

### 2c. Página - `/app/insights`

- `src/app/(in-app)/app/insights/page.tsx` - Página principal com MonthSelector

### 2d. Navegação

- Adicionar item "Relatórios" no sidebar (`src/shared/layout/app-sidebar.tsx`)
- Usar ícone `BarChart3Icon` do lucide

---

## Ordem de implementação

1. Fix do empty state do cartão de crédito
2. API de insights
3. Tipos e hook
4. Componentes UI dos insights
5. Página de insights
6. Item na sidebar
