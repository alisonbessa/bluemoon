# Mapeamento do Fluxo do Usuário

Este documento mapeia a jornada completa do usuário desde o cadastro até o uso pleno da plataforma, com análise do estado atual e sugestões de melhoria.

---

## Visão Geral

### Estado Atual do Fluxo

```
Cadastro (sign-up)
    ↓
Login (sign-in)
    ↓
Dashboard (/app)
    ↓
Modal de Onboarding (13 steps)
    ↓
Setup sequencial:
    ├─ /app/accounts/setup
    ├─ /app/income/setup
    ├─ /app/categories/setup
    ├─ /app/budget/setup (básico)
    └─ /app/goals/setup
    ↓
Plataforma completa
```

### Problemas Identificados

| Problema | Impacto | Prioridade |
|----------|---------|------------|
| Modal de onboarding + Setup são redundantes | Usuário repete informações, UX confusa | Alta |
| Metas aparecem em 2 lugares (onboarding + setup) | Confusão, duplicação de trabalho | Alta |
| Benefícios coletam dados que pertencem a Income | Mistura de responsabilidades | Média |
| /app/budget/setup não é igual a /app/budget | Usuário não aprende a interface real | Alta |
| Fluxo muito longo | Abandono, frustração | Alta |

---

## Proposta: Novo Fluxo Unificado

### Conceito: Tutorial Integrado (Spotlight Tutorial)

Ao invés de modal separado + páginas /setup, o usuário aprende usando a **plataforma real** com um sistema de tutorial que:

1. **Destaca elementos** na tela (spotlight/highlight)
2. **Explica brevemente** o que é cada área
3. **Guia ação a ação** (ex: "Agora adicione sua primeira conta")
4. **Valida conclusão** antes de avançar
5. **Permite pular** a qualquer momento

### Novo Fluxo Proposto

```
Cadastro (sign-up)
    ↓
Login (sign-in)
    ↓
Dashboard (/app) com Tutorial Ativo
    ↓
Step 1: Boas-vindas
    → Explica a plataforma
    → Coleta nome de exibição
    → Coleta composição familiar (simplificado)
    ↓
Step 2: Contas (/app/accounts)
    → Spotlight na área de contas
    → Guia: "Adicione sua primeira conta"
    → Usuário interage com a interface REAL
    → Valida: pelo menos 1 conta criada
    ↓
Step 3: Fontes de Renda (/app/income)
    → Spotlight na área de renda
    → Guia: "De onde vem seu dinheiro?"
    → Inclui configuração de benefícios (VR/VA)
    → Valida: pelo menos 1 fonte de renda
    ↓
Step 4: Categorias (/app/categories)
    → Oferece sugestões baseadas no perfil
    → Usuário pode aceitar sugestões ou personalizar
    → Valida: categorias básicas criadas
    ↓
Step 5: Metas (/app/goals) - OPCIONAL
    → "Tem algum objetivo financeiro?"
    → Se sim: guia criação de 1 meta
    → Se não: pula para orçamento
    → Metas criadas viram categorias no grupo "Metas"
    ↓
Step 6: Orçamento (/app/budget)
    → Spotlight no painel de alocação
    → Guia: "Distribua sua renda nas categorias"
    → Metas aparecem como categorias para alocar
    → Mostra saldo disponível em tempo real
    → Valida: algumas alocações feitas
    ↓
Conclusão
    → Confetti/celebração
    → Resumo do que foi configurado
    → "Sua plataforma está pronta!"
    ↓
Plataforma completa (tutorial desativado)
```

---

## Detalhamento dos Steps

### Step 1: Boas-vindas

**Tela:** Dashboard (/app) com overlay escuro

**Conteúdo:**
```
┌────────────────────────────────────────────────┐
│                                                │
│   👋 Bem-vindo(a) ao BlueMoon!                 │
│                                                │
│   Vamos configurar sua vida financeira         │
│   em poucos minutos.                           │
│                                                │
│   Como você gostaria de ser chamado(a)?        │
│   ┌────────────────────────────────────────┐   │
│   │ [                                    ] │   │
│   └────────────────────────────────────────┘   │
│                                                │
│   Quem mais faz parte do seu orçamento?        │
│   ┌────────────────────────────────────────┐   │
│   │ ☐ Parceiro(a)                          │   │
│   │ ☐ Filho(s) - Quantos? [_]              │   │
│   │ ☐ Outros adultos - Quantos? [_]        │   │
│   │ ☐ Pet(s) - Quantos? [_]                │   │
│   └────────────────────────────────────────┘   │
│                                                │
│   [Pular tutorial]          [Continuar →]      │
│                                                │
└────────────────────────────────────────────────┘
```

**Dados coletados:**
- `displayName`
- `householdMembers` (simplificado)

**Validação:** Nome preenchido

---

### Step 2: Contas

**Tela:** /app/accounts (interface real)

**Tutorial overlay:**
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  💳 Suas Contas                                       ║  │
│  ║                                                       ║  │
│  ║  Aqui você cadastra onde seu dinheiro está:           ║  │
│  ║  • Contas bancárias                                   ║  │
│  ║  • Cartões de crédito                                 ║  │
│  ║  • Carteira/Dinheiro                                  ║  │
│  ║  • Investimentos                                      ║  │
│  ║                                                       ║  │
│  ║  👆 Clique em "Nova Conta" para começar               ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ [🔦 SPOTLIGHT]                                      │    │
│  │ ┌─────────────┐                                     │    │
│  │ │ + Nova Conta│  ← Este botão!                      │    │
│  │ └─────────────┘                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Pular este passo]                    [2/6] ● ○ ○ ○ ○ ○    │
└─────────────────────────────────────────────────────────────┘
```

**Ação esperada:** Usuário clica em "Nova Conta"

**Depois que cria a conta:**
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  ✅ Ótimo! Primeira conta criada!                     ║  │
│  ║                                                       ║  │
│  ║  Você pode adicionar mais contas agora ou depois.     ║  │
│  ║                                                       ║  │
│  ║  [+ Adicionar outra conta]     [Próximo passo →]      ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────┘
```

**Validação:** Pelo menos 1 conta criada

---

### Step 3: Fontes de Renda

**Tela:** /app/income (interface real)

**Tutorial overlay:**
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  💰 Suas Fontes de Renda                              ║  │
│  ║                                                       ║  │
│  ║  Cadastre de onde vem seu dinheiro:                   ║  │
│  ║  • Salário                                            ║  │
│  ║  • Benefícios (VR, VA, VT)                            ║  │
│  ║  • Freelance/Renda extra                              ║  │
│  ║  • Aluguel, investimentos, etc.                       ║  │
│  ║                                                       ║  │
│  ║  💡 Benefícios: informe o valor e dia de recebimento  ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────┘
```

**IMPORTANTE:** Aqui entra a mudança que você mencionou:
- Benefícios (VR/VA) são cadastrados como **fonte de renda**
- A conta do benefício (criada no step anterior) recebe os depósitos
- Campos: valor, dia do mês, conta de destino

**Validação:** Pelo menos 1 fonte de renda

---

### Step 4: Categorias

**Tela:** /app/categories (interface real)

**Tutorial overlay:**
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  📁 Categorias de Gastos                              ║  │
│  ║                                                       ║  │
│  ║  Preparamos sugestões baseadas no seu perfil:         ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  ┌─ Essenciais ─────────────────────────────────────────┐   │
│  │ ☑ 🏠 Moradia    ☑ 🛒 Mercado    ☑ 🚗 Transporte    │   │
│  │ ☑ 💡 Luz        ☑ 💧 Água       ☑ 📶 Internet      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Estilo de Vida ─────────────────────────────────────┐   │
│  │ ☐ 🍔 Delivery   ☑ 🎬 Streaming  ☐ 💪 Academia      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  [Personalizar depois]              [Aceitar sugestões →]   │
└─────────────────────────────────────────────────────────────┘
```

**Opções:**
1. "Aceitar sugestões" → Cria categorias automaticamente
2. "Personalizar" → Usuário interage com a interface real

**Validação:** Categorias básicas existem

---

### Step 5: Metas (Opcional)

**Tela:** /app/goals

**Tutorial overlay:**
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  🎯 Metas Financeiras                                 ║  │
│  ║                                                       ║  │
│  ║  Tem algum sonho ou objetivo que quer alcançar?       ║  │
│  ║                                                       ║  │
│  ║  Sugestões populares:                                 ║  │
│  ║  • 🚨 Reserva de emergência                           ║  │
│  ║  • ✈️ Viagem dos sonhos                               ║  │
│  ║  • 🚗 Carro novo                                      ║  │
│  ║  • 🏠 Casa própria                                    ║  │
│  ║                                                       ║  │
│  ║  💡 Suas metas aparecerão no orçamento para você      ║  │
│  ║     reservar dinheiro todo mês.                       ║  │
│  ║                                                       ║  │
│  ║  [Criar uma meta]        [Pular, configurar depois]   ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────┘
```

**Validação:** Opcional - pode pular

**Ao criar meta:** Sistema calcula `monthlyTarget` (valor sugerido mensal) baseado em:
- Valor total da meta
- Prazo desejado
- Já mostra preview: "Para alcançar R$ 6.000 em 12 meses, reserve R$ 500/mês"

---

### Step 6: Orçamento

**Tela:** /app/budget (interface real - A MESMA que ele vai usar depois!)

**Tutorial overlay (aparece sobre a interface real):**
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  📊 Seu Orçamento                                     ║  │
│  ║                                                       ║  │
│  ║  Aqui você distribui sua renda mensal nas categorias. ║  │
│  ║                                                       ║  │
│  ║  💡 Dica: Comece pelas despesas fixas (moradia, luz)  ║  │
│  ║     e depois distribua o resto.                       ║  │
│  ║                                                       ║  │
│  ║  Saldo disponível: R$ 5.000,00                        ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  [🔦 SPOTLIGHT na categoria "Moradia"]                      │
│  👆 Clique em uma categoria para alocar um valor            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Se usuário criou metas:** Destacar o grupo "Metas" mostrando que pode alocar:
```
┌─────────────────────────────────────────────────────────────┐
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  🎯 Suas metas estão aqui!                            ║  │
│  ║                                                       ║  │
│  ║  Veja que sua meta "Viagem" aparece como categoria.   ║  │
│  ║  O valor sugerido é R$ 500/mês para alcançar em 12m.  ║  │
│  ║                                                       ║  │
│  ║  👆 Clique para alocar um valor mensal                ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
└─────────────────────────────────────────────────────────────┘
```

**Ação esperada:** Usuário clica em uma categoria e aloca valor

**Validação:** Pelo menos 1 alocação feita (tutorial pode pedir 2-3)

---

### Conclusão

**Tela:** Dashboard com overlay de celebração

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🎉 ✨ 🎊                                 │
│                                                             │
│              Sua plataforma está pronta!                    │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗  │
│  ║  Resumo da sua configuração:                          ║  │
│  ║                                                       ║  │
│  ║  💳 3 contas cadastradas                              ║  │
│  ║  💰 2 fontes de renda (R$ 6.500/mês)                  ║  │
│  ║  📁 12 categorias criadas                             ║  │
│  ║  🎯 1 meta definida                                   ║  │
│  ╚═══════════════════════════════════════════════════════╝  │
│                                                             │
│  💡 Você pode ajustar tudo isso a qualquer momento         │
│     nas configurações.                                      │
│                                                             │
│              [Começar a usar o BlueMoon →]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Mudanças Específicas Solicitadas

### 1. Cadastro de Benefícios

**Estado Atual:**
- Em /app/accounts/setup: benefícios têm campos de saldo, data de recebimento e valor
- Em /app/income/setup: fontes de renda têm valor, frequência e conta de destino

**Proposta:**
- **Conta do benefício** (em /app/accounts):
  - Nome (ex: "VR Alelo")
  - Tipo: benefit
  - Saldo atual
  - ~~Data de recebimento~~ → REMOVER
  - ~~Valor mensal~~ → REMOVER

- **Fonte de renda do benefício** (em /app/income):
  - Nome (ex: "VR - Empresa X")
  - Tipo: benefit
  - Valor mensal
  - Dia do recebimento
  - Conta de destino (seleciona a conta VR)

**Benefício:** Separação clara de responsabilidades. Conta = onde está. Renda = de onde vem.

### 2. /app/budget/setup igual a /app/budget

**Estado Atual:**
- /app/budget/setup é uma página diferente com resumo
- /app/budget é a interface real do orçamento

**Proposta:**
- REMOVER /app/budget/setup como página separada
- USAR /app/budget diretamente com tutorial overlay
- Usuário aprende na interface real

### 3. Metas - Remover duplicação

**Estado Atual:**
- Metas coletadas no modal de onboarding (step-goals.tsx)
- Metas configuradas em /app/goals/setup

**Proposta:**
- REMOVER step de metas do modal de onboarding
- Metas são configuradas APENAS em /app/goals durante o tutorial
- Etapa é OPCIONAL no tutorial

---

## Componentes Técnicos Necessários

### TutorialProvider

```typescript
// src/components/tutorial/tutorial-context.tsx

interface TutorialState {
  isActive: boolean;
  currentStep: TutorialStep;
  completedSteps: TutorialStep[];
  canSkip: boolean;
}

type TutorialStep =
  | 'welcome'
  | 'accounts'
  | 'income'
  | 'categories'
  | 'budget'
  | 'goals'
  | 'complete';

interface TutorialContextType {
  state: TutorialState;
  nextStep: () => void;
  skipStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  isStepComplete: (step: TutorialStep) => boolean;
}
```

### SpotlightOverlay

```typescript
// src/components/tutorial/spotlight-overlay.tsx

interface SpotlightOverlayProps {
  targetSelector: string;      // CSS selector do elemento a destacar
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  onNext: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  stepIndicator?: {
    current: number;
    total: number;
  };
}
```

### TutorialTooltip

```typescript
// src/components/tutorial/tutorial-tooltip.tsx

interface TutorialTooltipProps {
  children: React.ReactNode;  // Elemento a envolver
  content: string;
  isActive: boolean;
  onComplete: () => void;
}
```

---

## Banco de Dados

### Novas Colunas na Tabela `users`

```typescript
// Adicionar ao schema
tutorialStep: varchar("tutorial_step", { length: 50 }),
tutorialCompletedAt: timestamp("tutorial_completed_at"),
tutorialSkippedAt: timestamp("tutorial_skipped_at"),
```

### Migrar de `onboardingCompletedAt`

- Manter `onboardingCompletedAt` para compatibilidade
- Novo campo `tutorialCompletedAt` indica tutorial finalizado
- Lógica: se `tutorialCompletedAt` existe, não mostra tutorial

---

## Comparativo: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Etapas totais** | 13 modal + 5 setup = 18 | 6 steps integrados |
| **Tempo estimado** | 15-20 min | 5-8 min |
| **Aprendizado da UI** | Separado da UI real | Na UI real |
| **Duplicação de dados** | Metas em 2 lugares | Cada dado em 1 lugar |
| **Possibilidade de abandono** | Alta (muito longo) | Baixa (rápido e útil) |
| **Benefícios** | Dados misturados | Conta + Renda separados |

---

## Plano de Implementação

### Fase 1: Infraestrutura (sem quebrar o atual)

1. Criar TutorialProvider e contexto
2. Criar SpotlightOverlay e TutorialTooltip
3. Adicionar colunas no banco
4. Criar flag de feature para novo tutorial

### Fase 2: Migrar fluxo de benefícios

1. Remover campos de data/valor de contas benefit
2. Garantir que Income Sources suporta benefícios
3. Migrar dados existentes

### Fase 3: Integrar Tutorial nas páginas

1. /app/accounts com tutorial overlay
2. /app/income com tutorial overlay
3. /app/categories com tutorial overlay
4. /app/budget com tutorial overlay
5. /app/goals com tutorial overlay

### Fase 4: Remover código antigo

1. Remover rotas /setup
2. Remover modal de onboarding antigo
3. Limpar código não usado

---

## Perguntas em Aberto

1. **Nomes dos membros:** Coletar na boas-vindas ou quando adicionar transação do membro?

2. **Moradia (aluguel/financiamento):**
   - Coletar durante boas-vindas? (como antes)
   - Ou deixar para categorias? (usuário cria categoria "Aluguel")

3. **Transporte:**
   - Coletar tipos de transporte?
   - Ou deixar para categorias?

4. **Detalhes de utilidades (luz, água, gás separados):**
   - Perguntar durante tutorial?
   - Ou oferecer como opção nas categorias?

**Sugestão:** Começar simples. Perguntar apenas o essencial (nome, membros). O resto pode ser inferido das categorias que o usuário criar ou aceitar.

---

## Métricas de Sucesso

- **Taxa de conclusão do tutorial:** Meta > 80%
- **Tempo médio de conclusão:** Meta < 8 minutos
- **Usuários que voltam após 7 dias:** Meta > 50%
- **Satisfação (NPS):** Coletar no final do tutorial

---

## Status da Implementação

### Fase 1: Infraestrutura - CONCLUÍDA

| Item | Status | Arquivos |
|------|--------|----------|
| Fluxo 'initial-setup' no tutorial-steps.ts | Concluído | `src/components/tutorial/tutorial-steps.ts` |
| WelcomeModal para boas-vindas | Concluído | `src/components/tutorial/welcome-modal.tsx` |
| CelebrationModal para conclusão | Concluído | `src/components/tutorial/celebration-modal.tsx` |
| Página /app/income (era só /setup) | Concluído | `src/app/(in-app)/app/income/page.tsx` |
| Data-tutorial selectors nas páginas | Concluído | accounts, categories, goals, budget |
| Layout.tsx usando novo fluxo | Concluído | `src/app/(in-app)/layout.tsx` |
| API endpoint /onboarding/welcome | Concluído | `src/app/api/app/onboarding/welcome/route.ts` |

### Fase 2: Migrar Benefícios - PENDENTE

Esta fase envolve remover os campos `monthlyDeposit` e `depositDay` do formulário de contas benefit e garantir que toda configuração de valores e datas fique em Income Sources.

**Arquivos afetados:**
- `src/components/accounts/account-form.tsx` - Remover campos de benefício
- `src/components/accounts/account-card.tsx` - Ajustar exibição
- `src/app/api/app/accounts/route.ts` - Não mais aceitar campos de benefício
- O schema do banco pode manter os campos por compatibilidade

### Fase 3: Limpeza - PENDENTE

1. Remover rotas /setup (accounts, income, budget, goals, categories)
2. Remover modal de onboarding antigo (`src/components/onboarding/`)
3. Limpar imports não usados

---

## Como Testar o Novo Fluxo

1. Limpar localStorage:
   ```js
   localStorage.removeItem('hivebudget_tutorial_completed')
   localStorage.removeItem('hivebudget_welcome_completed')
   localStorage.removeItem('onboarding-skipped')
   ```

2. Criar novo usuário OU resetar `onboardingCompletedAt` para null no banco

3. Acessar /app - deve aparecer o WelcomeModal

4. Completar boas-vindas → tutorial inicia automaticamente

5. Navegar pelas páginas seguindo o tutorial

6. Ao final → CelebrationModal com confetti

---

*Documento criado em: Dezembro 2025*
*Última atualização: Dezembro 2025*
