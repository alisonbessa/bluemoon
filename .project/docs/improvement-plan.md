# Plano de Melhorias — HiveBudget

> Última atualização: 2026-03-22
> Status: Em planejamento (iterativo)

---

## Decisões Estratégicas

- **Sem app mobile por agora** — WhatsApp é o canal principal de input
- **Open Finance** — adiado para quando tivermos 1.000+ usuários pagantes
- **Foco atual:** Onboarding, Relatórios/Insights, e melhorias práticas de UX
- **IA conversacional (estilo Monarch)** — no roadmap futuro, não agora

---

## 1. Quick-Add de Transação

### Problema
Registrar um gasto exige navegar até Transações > Nova Transação. Muitas etapas para algo que deveria ser instantâneo.

### Posicionamento — canto inferior direito reservado

O botão flutuante de feedback já ocupa `bottom-right` (`fixed bottom-4 right-4 z-50`). Em fase beta, o feedback é prioridade e deve continuar ali. No futuro, esse mesmo canto será ocupado pelo chat de IA (estilo Monarch). Portanto, o canto inferior direito tem um ciclo de vida definido:

1. **Agora (beta):** Botão de feedback (como está)
2. **Futuro:** Chat de IA conversacional

O quick-add de transação não deve competir por esse espaço.

### Decisão: Botão "+" na sidebar

Adicionar um item destacado no topo da sidebar (antes do Dashboard) que abre o modal de nova transação. Quando a sidebar está colapsada, aparece só o ícone "+". Padrão do Linear/Notion.

Complementar com atalho de teclado Ctrl/Cmd+N para power users.

Esse posicionamento:
- Fica sempre visível sem conflito com o FAB de feedback
- É consistente com a navegação existente do app
- Funciona bem tanto em sidebar expandida quanto colapsada
- Libera o canto inferior direito para o ciclo feedback > IA

### Especificação do Quick-Add
- Item no topo da sidebar com ícone "+" e label "Nova Transação"
- **Estilo destacado:** fundo `bg-primary` (roxo), ícone/texto `text-primary-foreground` (branco), `shadow-sm`. Quando colapsado, círculo roxo com "+". Quando expandido, botão roxo com "+ Nova Transação". Destaca-se da sidebar neutra como "a ação principal" do app.
- Ao clicar, abre modal simplificado (não navega para outra página)
- Campos: valor (foco automático), tipo (receita/despesa), categoria (dropdown), conta, descrição (opcional)
- 3 toques para registrar um gasto
- Atalho de teclado: Ctrl/Cmd+N
- Fechar e limpar após salvar (pronto para o próximo)

---

## 2. Onboarding Simplificado

### Estado atual
O onboarding é 100% automático: cria budget, categorias padrão, conta corrente e fonte de renda sem perguntar nada ao usuário. Depois, um tutorial spotlight guia por 9 etapas (contas > renda > categorias > metas > alocações > transações > dashboard > convite parceiro > celebração).

### Problemas
1. O usuário não escolhe nada, recebe categorias genéricas que podem não fazer sentido
2. O tutorial tem 9 etapas com navegação entre páginas, é longo demais
3. As fontes de renda são criadas com valor R$0, o que não ajuda na alocação
4. Não pergunta perfil (solteiro vs casal vs família)
5. Não contextualiza para beta testers
6. **Beta testers não escolhem plano (Solo/Duo)** e ficam com `planId = null`, o que impede convite de parceiro

### Bug crítico: beta tester sem plano

O fluxo atual do beta tester tem um mismatch:
- O `role = "beta"` pula o paywall (nunca vê a página de escolha de plano)
- Mas o `planId` fica `null` (nenhum plano atribuído)
- A rota de convites (`POST /api/app/invites`) verifica `plan.quotas.maxBudgetMembers`, que sem plano retorna 1
- **Resultado: beta testers não conseguem convidar parceiro**

O parceiro convidado, por sua vez, ganharia acesso normalmente via `checkPartnerAccess` (que reconhece o `role = "beta"` do owner). O problema é apenas na criação do convite.

### Solução: escolha de plano antes do onboarding (sem Stripe)

A escolha de plano acontece em uma tela separada, antes do wizard de onboarding. Isso separa duas decisões mentais diferentes: "como vou usar" (plano) vs "como são minhas finanças" (onboarding).

### Fluxo completo do novo usuário

```
Signup → Escolha de plano (Solo/Duo) → Wizard de onboarding (3 passos) → Dashboard
```

#### Tela de escolha de plano (`/app/choose-plan`)

Reutiliza a página existente de choose-plan, adaptada para beta:

**Para beta testers (`role = "beta"`):**
- Mesmos dois cards (Solo e Duo) com features listadas
- Sem preços, sem Stripe. Texto: "Grátis durante o beta"
- Ao clicar, chama novo endpoint `POST /api/app/choose-plan-beta` que:
  - Busca o plano pelo codename (`solo` ou `duo`)
  - Atribui o `planId` no user
  - Retorna sucesso
- Redireciona para o wizard de onboarding

**Para usuários pagantes (futuro, sem `role = "beta"`):**
- Comportamento atual mantido (redireciona para Stripe checkout)

**Lógica de redirect no layout:**
- Hoje: `subscriptionStatus === "none"` → `/app/choose-plan`
- Beta tester com `planId = null` → precisa ir para `/app/choose-plan` também
- Ajustar `useSubscriptionGate`: se `role === "beta"` mas `planId === null`, status = `"needs_plan"` em vez de `"exempt"`
- O layout redireciona `"needs_plan"` para `/app/choose-plan`
- Após escolher, status vira `"exempt"` (tem role beta + planId definido)

#### Wizard de onboarding (3 passos, após escolha de plano)

O plano já está definido quando o wizard começa, então o wizard sabe se é Solo ou Duo.

**Passo 1 — "Quem é você?"**
- Nome (já temos do cadastro)
- Perfil do template:
  - Se Solo: Solteiro(a) / Universitário(a)
  - Se Duo: Casal sem filhos / Casal com filhos
- Se Duo: "Quer convidar seu parceiro(a) agora?" (email do parceiro, opcional)

**Passo 2 — "Suas finanças"**
- Renda mensal líquida (campo de valor)
- Se Duo: renda de cada um separadamente
- Conta principal: nome + tipo (corrente/poupança)
- Cartão de crédito principal: nome + dia de fechamento + dia de vencimento (opcional)

**Passo 3 — "Seu orçamento"**
- Mostra o template pré-configurado baseado no perfil escolhido
- Categorias com alocações sugeridas (proporcionais à renda)
- Visualização por grupo com barras de proporção (ver seção de Templates)
- Usuário pode expandir grupos para ajustar categorias individuais
- Barra de "total alocado vs renda" em tempo real
- Botão "Parece bom, vamos lá!" para confirmar

**Após o wizard:**
- Budget criado com todas as configurações
- Redireciona para o dashboard
- Card de boas-vindas no dashboard com 3 sugestões: "Registre seu primeiro gasto", "Conecte o WhatsApp", "Explore o orçamento"
- Sem tutorial spotlight longo

#### Fase 2: "Primeira semana" guiada (depois do wizard)
Checklist persistente no dashboard (estilo Notion/Linear) que desaparece quando completo:
- [ ] Registre seu primeiro gasto
- [ ] Confira suas categorias no orçamento
- [ ] Conecte o WhatsApp/Telegram
- [ ] Veja o dashboard após 3 dias
- [ ] Convide seu parceiro(a) (se Duo)

Cada item completo mostra um micro-feedback ("Boa! Primeiro gasto registrado.").

---

## 3. Templates de Orçamento — Análise Profunda

### O problema real

A maioria das pessoas nunca planejou finanças. Pedir que alguém defina 15 categorias e distribua a renda entre elas é como pedir que um novato no xadrez planeje 10 jogadas à frente. O resultado é: desistência, valores aleatórios, ou tudo zerado.

O template precisa resolver 3 problemas ao mesmo tempo:
1. **"Não sei por onde começar"** — dar um ponto de partida que faça sentido
2. **"Não sei se estou fazendo certo"** — validar as escolhas com referências
3. **"Não quero gastar 30 minutos configurando"** — ser rápido e funcional

### Filosofia: "Funciona de cara, melhora com o tempo"

O template não precisa ser perfeito. Ele precisa ser **bom o suficiente** para que:
- O dashboard mostre dados reais desde o dia 1
- O usuário consiga registrar gastos e ver progresso imediatamente
- As categorias façam sentido sem explicação
- A página de orçamento não esteja vazia

O ajuste fino acontece naturalmente: o usuário vai mexer nos valores à medida que gasta e percebe que alocou demais ou de menos. Isso é o ciclo do budget-first.

### Como o sistema de orçamento funciona (para contexto)

- **5 grupos fixos e globais:** Essencial, Estilo de Vida, Gastos Pessoais, Investimentos, Metas
- **Categorias** pertencem a um grupo e a um budget. Cada uma tem `plannedAmount` (valor padrão mensal)
- **Alocações mensais** são overrides por mês. Se não existir override, usa o `plannedAmount`
- **Comportamentos:** `refill_up` (reseta todo mês) vs `set_aside` (acumula saldo não usado)
- **Categorias pessoais** têm `memberId` preenchido (para o grupo "Gastos Pessoais")
- **Modelo de contribuição** (casais): cada fonte de renda pode ter um `contributionAmount` que define quanto vai para o orçamento compartilhado vs reserva pessoal

**Implicação para templates:** podemos setar `plannedAmount` nas categorias na criação e o sistema de alocação já funciona. Não precisamos criar registros em `monthlyAllocations` — eles são criados sob demanda quando o usuário visualiza ou edita.

### Integração com o wizard de onboarding

O template se conecta ao wizard assim:

```
Passo 0: Escolhe plano (Solo/Duo)
Passo 1: Escolhe perfil → seleciona template
Passo 2: Informa renda → calcula valores das categorias
Passo 3: Revisa e ajusta → confirma
→ Budget criado com tudo preenchido
```

### A tela de revisão (Passo 3) — a parte mais importante

Esta é a tela onde o template ganha vida. Não deve ser uma tabela fria com números. Proposta:

**Layout: simulação visual do orçamento**

Mostrar os grupos como blocos empilháveis, cada um com uma barra de proporção e o valor total:

```
┌─────────────────────────────────────────────┐
│ Sua renda: R$ 8.000/mês                     │
├─────────────────────────────────────────────┤
│ ████████████████████░░░░░░░░░░░  Essencial  │
│ R$ 4.400 (55%)                              │
│   Moradia R$2.400 · Mercado R$960 · ...     │
├─────────────────────────────────────────────┤
│ ████████░░░░░░░░░░░░░░░░░░░░░░  Est. Vida  │
│ R$ 1.120 (14%)                              │
│   Alimentação Fora R$400 · Lazer R$320 · ...│
├─────────────────────────────────────────────┤
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░  Pessoal    │
│ R$ 480 (6%)                                 │
│   Gastos - Maria R$240 · Gastos - João R$240│
├─────────────────────────────────────────────┤
│ ████████░░░░░░░░░░░░░░░░░░░░░░  Investir    │
│ R$ 1.200 (15%)                              │
│   Reserva R$800 · Investimentos R$400       │
├─────────────────────────────────────────────┤
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░░  Metas      │
│ R$ 800 (10%)                                │
│   (nenhuma meta ainda — crie depois)        │
├─────────────────────────────────────────────┤
│ ✓ Total alocado: R$ 8.000 / R$ 8.000       │
│   [Ajustar valores]  [Parece bom, vamos lá!]│
└─────────────────────────────────────────────┘
```

**Interações na revisão:**
- Clicar em um grupo expande para ver/editar categorias individuais
- Arrastar/editar valores recalcula proporções em tempo real
- Barra de "total alocado vs renda" mostra se sobrou ou faltou
- Não precisa fechar 100% — pode ficar com sobra (o sistema aceita)
- Botão "Adicionar categoria" em cada grupo
- Botão "Remover" em categorias que não fazem sentido

**Para casais — modelo de contribuição:**
- Se ambas as rendas foram informadas no Passo 2, mostrar o split:
  - "Vocês ganham R$12.000 juntos"
  - "Sugestão: cada um contribui proporcionalmente"
  - Slider ou input para definir contribuição de cada um
  - Default: 100% de ambos vai para o orçamento compartilhado (mais simples de começar)
  - Pode ajustar depois em Config > Renda

### Templates detalhados

#### Template: Casal sem filhos

| Grupo | Categoria | % da Renda | Comportamento | Notas |
|-------|-----------|------------|---------------|-------|
| **Essencial** | Moradia | 30% | refill_up | Aluguel ou financiamento |
| | Contas de Casa | 5% | refill_up | Luz, água, internet, condomínio |
| | Mercado | 12% | refill_up | Compras de supermercado |
| | Transporte | 8% | refill_up | Combustível, transporte público, apps |
| | Saúde | 3% | refill_up | Plano de saúde, farmácia |
| **Estilo de Vida** | Alimentação Fora | 5% | refill_up | Restaurantes, delivery, cafés |
| | Lazer | 4% | refill_up | Cinema, shows, passeios |
| | Vestuário e Beleza | 3% | refill_up | |
| | Assinaturas | 2% | refill_up | Streaming, apps, academia |
| **Gastos Pessoais** | Pessoal - [Nome 1] | 3% | refill_up | memberId = owner |
| | Pessoal - [Nome 2] | 3% | refill_up | memberId = partner (criado agora ou quando parceiro entrar) |
| **Investimentos** | Reserva de Emergência | 10% | set_aside | Meta: 6 meses de despesas |
| | Investimentos | 5% | set_aside | Aportes mensais |
| **Metas** | (vazio) | 7% | — | Sugestão: "Crie sua primeira meta depois!" |
| | **Total** | **100%** | | |

#### Template: Casal com filhos

Base do "Casal sem filhos" com ajustes:

| Mudança | Antes | Depois |
|---------|-------|--------|
| + Escola/Creche (Essencial) | — | 10% |
| + Roupas/Material Escolar (Essencial) | — | 3% |
| + Atividades Infantis (Estilo de Vida) | — | 2% |
| Moradia | 30% | 28% |
| Lazer | 4% | 2% |
| Investimentos | 5% | 3% |
| Metas | 7% | 2% |
| Pessoal (cada) | 3% | 2% |

#### Template: Solteiro(a)

| Grupo | Categoria | % da Renda | Comportamento |
|-------|-----------|------------|---------------|
| **Essencial** | Moradia | 30% | refill_up |
| | Contas de Casa | 5% | refill_up |
| | Mercado | 10% | refill_up |
| | Transporte | 8% | refill_up |
| | Saúde | 3% | refill_up |
| **Estilo de Vida** | Alimentação Fora | 6% | refill_up |
| | Lazer | 5% | refill_up |
| | Vestuário e Beleza | 3% | refill_up |
| | Assinaturas | 2% | refill_up |
| **Gastos Pessoais** | Pessoal | 5% | refill_up |
| **Investimentos** | Reserva de Emergência | 10% | set_aside |
| | Investimentos | 5% | set_aside |
| **Metas** | (vazio) | 8% | — |
| | **Total** | **100%** | |

#### Template: Universitário(a)

| Grupo | Categoria | % da Renda | Comportamento |
|-------|-----------|------------|---------------|
| **Essencial** | Moradia | 35% | refill_up |
| | Mercado | 15% | refill_up |
| | Transporte | 10% | refill_up |
| | Materiais e Educação | 5% | refill_up |
| **Estilo de Vida** | Alimentação Fora | 8% | refill_up |
| | Lazer | 7% | refill_up |
| **Gastos Pessoais** | Pessoal | 5% | refill_up |
| **Investimentos** | Reserva de Emergência | 10% | set_aside |
| **Metas** | (vazio) | 5% | — |
| | **Total** | **100%** | |

### Categorias com porcentagem de Metas = 0

Nos templates, "Metas" aparece com uma porcentagem reservada mas sem categorias. Isso é intencional:
- Metas são pessoais e variam muito (viagem, carro, casa, casamento...)
- Forçar uma meta genérica no setup é pior que não ter nenhuma
- O sistema de metas é separado das categorias (tem UI própria)
- A checklist de "primeira semana" sugere criar a primeira meta

A porcentagem reservada para Metas serve como "sobra planejada" — o usuário pode redistribuir depois ou criar metas para preencher.

### Implementação técnica

**Definição dos templates:**
```typescript
// src/shared/lib/budget-templates.ts
interface TemplateCategory {
  name: string;
  group: GroupCode;
  percentOfIncome: number;
  behavior: "refill_up" | "set_aside";
  icon?: string;
  isPersonal?: boolean; // cria com memberId
}

interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  planType: "solo" | "duo" | "both";
  categories: TemplateCategory[];
}
```

**Fluxo de criação:**

1. Wizard coleta: perfil (template), renda, contas
2. Frontend calcula `plannedAmount = renda * percentOfIncome` para cada categoria
3. Mostra preview visual para ajuste
4. Ao confirmar, chama novo endpoint `POST /api/app/onboarding/setup` que cria:
   - Budget + budget member(s)
   - Financial accounts informados
   - Income source(s) com valores reais
   - Categorias com `plannedAmount` preenchido
   - Categoria pessoal com `memberId` para cada membro
   - Não cria `monthlyAllocations` (o sistema gera sob demanda)
5. Seta `onboardingCompletedAt` no user
6. Redireciona para dashboard

**O que NÃO precisa mudar:**
- O sistema de alocação (já usa `plannedAmount` como fallback)
- A página de orçamento (já renderiza tudo corretamente)
- O modelo de contribuição (configurado depois pelo casal)
- As APIs de transações, metas, contas (independentes do onboarding)

**O que pode ser incrementado depois:**
- Wizard pergunta sobre dívidas e cria categorias de dívida (como o onboarding full faz)
- Wizard pergunta detalhes de moradia (aluguel vs financiamento, valor real)
- Sugestões inteligentes: "Você gasta mais que 30% em moradia — isso é comum, mas vale ficar de olho"
- Templates sazonais ou regionais

### Como isso traz valor de forma simples

Quando o usuário termina o wizard e abre o dashboard pela primeira vez:
- Os 3 cards de resumo mostram **renda real vs R$0 gastos** (não zeros vazios)
- A página de orçamento mostra **categorias organizadas com valores** (não uma lista vazia)
- Ao registrar o primeiro gasto, a barra de progresso da categoria se move
- O "Saldo Diário" começa a projetar com base na renda informada

É a diferença entre abrir um app vazio e abrir um app que já "sabe" sobre sua vida financeira.

---

## 4. Dashboard — Melhorias de Cards

### Estado atual dos cards
1. SummaryCardGrid (Saldo, Receitas, Despesas)
2. Metas (top 5) + Transações Agendadas
3. Saldo Diário (gráfico barras+linha) + Comparativo Mensal (barras)
4. Acerto do Mês (Duo) + Fatura do Cartão
5. Cards de navegação

### Melhorias propostas

**Card "Atenção" — despriorizado (P3)**
Ideia de página `/app/alerts` dedicada com categorias estouradas, faturas próximas, metas atrasadas, etc. Pode virar uma seção na página de relatórios no futuro, sem urgência.

**Comparativo Mensal — adicionar filtro por categoria**
O card "Comparativo Mensal" já existe. Adicionar um dropdown de categorias para filtrar a comparação por categoria específica, além do filtro de período que já existe.

**Forecast no "Saldo Diário"**
O card "Saldo Diário" já tem um toggle "Mostrar pendentes" que projeta receitas/despesas futuras. Validar se ele já considera:
- Receitas recorrentes (salários)
- Despesas recorrentes (contas fixas)
- Projeção de gastos variáveis (média dos últimos meses)
- Excluir contas de investimento do saldo projetado

**Activity Feed — novo card pequeno**
Card compacto mostrando as 5 últimas ações do casal:
- "Maria registrou R$50 em Restaurantes"
- "João alocou R$200 para Meta: Viagem"
Botão "Ver tudo" leva para `/app/activity` com lista completa, filtros por membro e por tipo de ação. Dados extraídos das transações e alocações recentes (não precisa de tabela de audit_log separada).

---

## 5. Página de Relatórios — Melhorias

### Estado atual
A página `/app/insights` tem:
1. 4 cards resumo (Saúde, Projeção, Média Diária, Taxa de Economia)
2. Top 5 categorias + categorias excedidas
3. Comparação com mês anterior (receita/despesa/economia)

### Melhorias propostas

**Seção "Alertas e Atenção" — despriorizado (P3)**
Ideia de seção no topo com itens que precisam de atenção. Pode ser adicionada no futuro como melhoria incremental da página de relatórios.

**Breakdown por categoria (drill-down)**
Ao clicar em uma categoria nos "Maiores Gastos":
- Modal ou seção expandida com:
  - Lista de transações daquela categoria no mês
  - Gráfico de tendência (últimos 6 meses)
  - Split por membro (quem gastou quanto)
  - Média mensal

**Gráfico de distribuição por grupo**
Donut chart mostrando a distribuição dos gastos por grupo (Essencial, Estilo de Vida, Gastos Pessoais, etc.). Complementa os "Maiores Gastos" com visão macro.

**Tendências de longo prazo**
Gráfico de linha mostrando evolução de métricas ao longo dos meses:
- Receita vs Despesa (6-12 meses)
- Taxa de economia ao longo do tempo
- Categorias específicas (filtro)

**Relatório do casal (Duo)**
Seção dedicada para plano Duo:
- Quanto cada um gastou no mês
- Contribuição de cada um vs planejado
- Sugestão de acerto

**Export**
Botão "Exportar relatório" gerando PDF com os principais dados do mês. Útil para guardar ou compartilhar.

---

## 6. Onboarding do Parceiro

### Fluxo atual
Parceiro aceita convite e cai direto no app sem contexto.

### Status do parceiro convidado por um beta tester
Quando o parceiro aceita o convite:
- É adicionado como `budgetMember` com `type = "partner"`
- Recebe o `planId` do owner (cópia)
- **Não recebe role `"beta"`** (role fica `"user"`)
- O acesso funciona via `checkPartnerAccess`: verifica se o owner tem subscription ativa OU role exempt (`beta`/`lifetime`/`admin`)
- **Resultado:** o parceiro de um beta tester tem acesso completo, sem precisar de role especial

Isso funciona corretamente. O parceiro não precisa de role `"beta"` porque o acesso é derivado do owner.

**Ponto de atenção para o futuro:** quando o beta acabar e o owner precisar assinar, o parceiro perde acesso junto. Isso é o comportamento esperado.

### Novo fluxo proposto
Ao aceitar o convite, o parceiro vê um mini-wizard de 3 telas:

**Tela 1 — "Bem-vindo ao orçamento de [Nome do Owner]!"**
- Explicação rápida do método: "Aqui, cada real tem uma função antes de sair da conta."
- "Vocês vão planejar juntos o que importa, cada um com seu espaço pessoal."

**Tela 2 — "Conheça o que já está configurado"**
- Resumo visual das categorias, contas e metas já criadas
- "Seu parceiro(a) já configurou o básico. Você pode ajustar depois."

**Tela 3 — "Configure seu acesso rápido"**
- Conectar WhatsApp/Telegram
- Adicionar conta pessoal (opcional)
- "Registre seu primeiro gasto para começar!"

---

## 7. Activity Feed

### Especificação
Card no dashboard + página dedicada `/app/activity`.

**Card no dashboard:**
- Título: "Atividade Recente"
- Mostra as 5 últimas ações
- Cada item: avatar/inicial do membro + descrição + horário relativo
- Botão "Ver tudo"

**Página dedicada:**
- Lista cronológica completa
- Filtros: por membro, por tipo (transação, alocação, meta, config)
- Agrupamento por dia
- Paginação ou scroll infinito

**Tipos de atividade:**
- Transação criada/editada/excluída
- Alocação criada/alterada
- Meta criada/contribuição
- Conta adicionada
- Categoria criada/editada

**Implementação:**
Não precisa de tabela de audit log. Buscar diretamente das tabelas existentes ordenando por `createdAt` desc, com union de transactions + allocations + goals.

---

## 8. Relatório Mensal via Email

### Especificação
Email automático enviado no dia 1 de cada mês (via Inngest cron job) para todos os membros do budget.

**Conteúdo:**
- Título: "Resumo de [Mês] — [Nome do Budget]"
- Destaque: "Economizaram R$X!" ou "Gastaram R$X além do planejado"
- Total: Receita vs Despesa vs Orçado
- Top 3 categorias de gasto
- Metas: progresso resumido
- Cartões: fatura(s) do mês
- CTA: "Ver relatório completo" → `/app/insights?year=...&month=...`

**Regras:**
- Só envia se o budget teve pelo menos 1 transação no mês
- Enviado para todos os membros com email verificado
- Opt-out via configurações

---

## 9. Insights via WhatsApp — Futuro

### Problema de custo
Mensagens proativas no WhatsApp (fora da janela de 24h após última mensagem do usuário) custam dinheiro (template messages cobradas pela Meta).

### Abordagem proposta (para o futuro)
- Adicionar campo `lastWhatsappMessageAt` no schema do usuário
- Só enviar mensagens proativas se o usuário enviou algo nas últimas 24h (janela gratuita)
- Fora da janela: enviar via email (gratuito) como fallback
- Quando implementar: após ter base de usuários pagantes que justifique o custo
- Começar com resumo semanal apenas (1 mensagem/semana, menor custo)

### Prioridade
Secundário. Focar primeiro no email (gratuito e sem restrição de janela).

---

## 10. Email de Boas-Vindas (Beta)

### Estado atual
Email minimalista com "Olá, [nome]! Seja bem-vindo!" + 4 bullet points genéricos + botão "Acessar Dashboard".

### Novo email para fase beta
O email precisa comunicar que o usuário é especial (beta tester) e o que isso significa.

**Conteúdo proposto:**

- **Assunto:** "Bem-vindo ao time de beta testers do HiveBudget!"
- **Abertura:** "Olá, [nome]! Você é um dos primeiros a usar o HiveBudget."
- **O que é ser beta tester:**
  - Acesso gratuito a todas as funcionalidades
  - Seu feedback molda o produto
  - Desconto exclusivo de lançamento garantido
- **Primeiros passos:**
  - Configure seu orçamento (link)
  - Conecte o WhatsApp para registrar gastos por mensagem (link)
  - Convide seu parceiro(a) se tiver plano Duo
- **Como dar feedback:**
  - Botão de feedback dentro do app
  - Ou responder este email diretamente
- **CTA principal:** "Começar a configurar"
- **Tom:** Pessoal, animado, sem ser corporativo. "Estamos construindo isso junto com você."

---

## 11. Agente de IA (Futuro)

### Visão
Um assistente de IA dentro do app (estilo Monarch AI Assistant) que responde perguntas sobre os dados financeiros do usuário em linguagem natural.

### Exemplos de uso
- "Quanto gastamos em mercado nos últimos 3 meses?"
- "Quais categorias estouraram este mês?"
- "Se continuarmos nesse ritmo, vamos fechar o mês no positivo?"
- "Quanto cada um gastou em restaurantes?"

### Por que adiar
- Requer contexto financeiro completo (queries complexas)
- Custo de API de LLM por query
- Melhor quando tivermos mais dados históricos dos usuários
- Via WhatsApp é mais simples (já temos a infra)

### Quando implementar
Após validar que os relatórios/insights cobrem 80% das perguntas. O agente de IA cobriria os 20% restantes (perguntas ad-hoc).

---

## Matriz de Priorização

### P0 — Fazer agora

| Melhoria | Esforço | Notas |
|----------|---------|-------|
| Simplificar onboarding (wizard 3 passos) | Médio | Crítico para beta testers |
| Templates de orçamento | Médio | Parte do onboarding |
| Quick-Add transação | Baixo | Decidir posicionamento do FAB primeiro |
| Email de boas-vindas beta | Baixo | Template novo no React Email |

### P1 — Próximo ciclo

| Melhoria | Esforço | Notas |
|----------|---------|-------|
| Comparativo Mensal com filtro de categoria | Baixo | Extensão do card existente |
| Activity Feed (card + página) | Médio | Dados já existem |
| Onboarding do parceiro | Baixo | Mini-wizard 3 telas |
| Melhorias na página de Relatórios | Médio | Drill-down, distribuição, tendências |

### P2 — Melhorias contínuas

| Melhoria | Esforço | Notas |
|----------|---------|-------|
| Relatório mensal via email | Médio | Inngest cron + React Email |
| "Primeira semana" guiada (checklist) | Médio | Após novo onboarding |
| Forecast melhorado no Saldo Diário | Baixo | Validar o que já existe |

### P3 — Futuro

| Melhoria | Esforço | Notas |
|----------|---------|-------|
| Alertas (seção na página de relatórios) | Baixo | Agregação de dados existentes |
| Insights via WhatsApp | Alto | Problema de custo da janela de 24h |
| Agente de IA conversacional | Alto | Após validar relatórios |
| Open Finance (Pluggy/Belvo) | Muito Alto | Após 1.000+ usuários pagantes |
| Plano Família (5 membros) | Médio | Expansão natural do Duo |

---

## Notas de implementação

### Sobre o "Saldo Diário" existente
Verificar se o toggle "Mostrar pendentes" já projeta:
- Receitas recorrentes futuras
- Despesas recorrentes futuras
- Se considera média de gastos variáveis
- Se exclui contas de investimento

### Sobre o "Comparativo Mensal" existente
Já tem dropdown de período (3/6/12 meses). Adicionar dropdown de categoria para filtrar a comparação.

### Sobre o ViewMode (Eu/Nós/Parceiro)
Já implementado como dropdown na sidebar. Labels: "Pessoal", "Compartilhado", "Tudo".
Funciona para filtrar transações, contas, categorias e dados do dashboard.
