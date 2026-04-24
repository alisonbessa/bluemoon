# Funcionalidades do App (rotas `/app/*`)

Inventário das telas dentro de `src/app/(in-app)/app/**` — o que cada rota faz, como é acessada e variações relevantes. Use como base para revisão de produto e UX.

> Escopo: somente o app autenticado (`/app/*`). Fora deste documento: marketing, blog, políticas, fluxos de auth, super-admin, APIs e webhooks.

---

## Visão Geral da Navegação

### Sidebar (visível em todas as telas do app)
Itens ordenados como aparecem em `src/shared/layout/app-sidebar.tsx`:

| Ordem | Label | Rota | Bloqueio | Observação |
|---|---|---|---|---|
| 1 | Dashboard | `/app` | — | — |
| 2 | Planejamento | `/app/budget` | Requer conta criada | Mostra cadeado se sem conta |
| 3 | Transações | `/app/transactions` | Requer conta criada | Mostra cadeado se sem conta |
| 4 | Metas | `/app/goals` | Requer conta criada | Mostra cadeado se sem conta |
| 5 | Contas | `/app/accounts` | — | — |
| 6 | Relatórios | `/app/insights` | Requer conta criada | Mostra cadeado se sem conta |
| 7 | Configurações | `/app/settings` | — | — |
| + | Laboratório Beta | `/app/beta-lab` | Apenas roles beta/admin | Badge "Beta" + contador de novidades |

### Elementos globais sempre presentes (`AppShell`)
- **AppHeader** (topo).
- **ViewModeSelector** no sidebar — alterna *Pessoal / Compartilhado / Tudo* (só aparece em planos Duo com modelo de contribuição e fora de `/app/settings`; opções dependem do modo de privacidade).
- **QuickAddTransaction** no sidebar — atalho para registrar transação rápida.
- **FloatingChatbot** (canto inferior, lazy-loaded).
- **AnnouncementMounter** — toasts/modais de anúncios in-app não vistos.
- **TutorialOverlay** — passo a passo guiado, ativado pelo cartão de Suporte em Configurações.
- **SubscriptionExpiredBanner** — faixa fixa quando a assinatura está vencida (modo somente-leitura).

### Redirects automáticos (`AppShell`)
Aplicados em qualquer rota `/app/*`:
- Sem sessão / usuário inválido → `signOut` + `/`.
- Sem `name`/`displayName` (login por magic link) → `/app/complete-profile`.
- Sem assinatura ativa → `/app/choose-plan`.
- Parceiro recém-aceito (sem flag `partner_welcome_done`) → `/app/partner-welcome`.
- Onboarding incompleto (não-parceiro) → `/app/setup`.

---

## Telas listadas no menu

### `/app` — Dashboard ("Visão geral")
**Propósito:** Resumo financeiro do mês atual.
- **Cabeçalho:** título "Visão geral" + **MonthSelector** (navega meses).
- **Toggle de visão** (apenas com modelo de contribuição ativo): *Compartilhado* vs *Visão completa*.
- **GettingStartedChecklist** — lista de passos pendentes para novos usuários.
- **Cards de resumo (3):** Receitas/Contribuição do Mês, Despesas do Mês, Saldo. Cada um mostra valor realizado vs planejado e estado contextual (a receber, a pagar, excedido).
- **Card Metas:** top 5 metas em aberto com barra de progresso; CTA para `/app/goals`.
- **ScheduledTransactionsList:** transações agendadas/pendentes de confirmação no período.
- **DashboardCharts:** gráficos diário (intra-mês) e mensal (12 meses), lazy-loaded.
- **SharedExpensesBalance:** acerto de contas entre parceiros (Duo, não-unificado).
- **CreditCardSpending:** consumo por cartão de crédito com link para extrato detalhado.
- **Variações:** primeira execução (estados vazios + checklist), Solo vs Duo (toggle e balance só em Duo), modo de privacidade.

### `/app/budget` — Planejamento
**Propósito:** Definir e acompanhar alocações de orçamento por categoria no mês.
- Listagem de categorias com planejado vs realizado.
- Edição de alocação por categoria.
- Filtro por mês/ano.
- Respeita o ViewMode (pessoal/compartilhado/tudo).
- **Variações:** primeira vez (sem alocações), sem categorias, vista compartilhada vs pessoal.

### `/app/transactions` — Transações
**Propósito:** Consultar/gerenciar lançamentos.
- Lista com data, descrição, valor, categoria e conta.
- Criar / editar / remover transação.
- Filtros: período, categoria, conta, tipo (entrada/saída) e busca por descrição.
- Suporte a anexos (comprovantes).
- Confirmação de transações agendadas.
- Operações em lote (`/api/app/transactions/bulk`).
- Respeita o ViewMode.

### `/app/goals` — Metas
**Propósito:** Objetivos financeiros (curto/longo prazo, individuais ou compartilhados).
- Listar metas (em andamento e concluídas).
- Criar/editar/excluir meta com nome, ícone, cor, valor-alvo, prazo e categoria associada.
- Registrar contribuição (`/contribute`).
- Marcar como concluída.
- **Variações:** Pessoais vs compartilhadas (Duo), com/sem prazo.

### `/app/accounts` — Contas
**Propósito:** Gestão de contas bancárias, cartões e investimentos.
- Listar contas com saldo atual.
- Criar/editar/excluir conta.
- Acesso ao extrato por conta (`/api/app/accounts/[id]/statement`).
- Respeita o ViewMode.
- **Variações:** estado vazio, contas com diferentes contribuições (Duo).

### `/app/insights` — Relatórios
**Propósito:** Análises e gráficos de comportamento financeiro.
- Visão por categoria (pizza/barras).
- Tendências mês a mês.
- Comparações entre períodos.
- Atalho para extrato detalhado de cartão.
- **Variações:** sem dados suficientes nos primeiros meses.

#### `/app/insights/credit-card/[id]` — Extrato do cartão
- Lista todas as transações do cartão num mês (query params).
- Totais por categoria.
- Editar transações inline.
- Acessada a partir de Relatórios e do card do Dashboard.

### `/app/settings` — Configurações
**Propósito:** Hub central de preferências, conta, plano e parceiros.
Cards renderizados a partir de `_components/`:
- **ProfileCard** — apelido (display name).
- **AppearanceCard** — tema claro/escuro/sistema.
- **MembersManagement** *(Duo)* — convidar/remover parceiro.
- **PrivacySettings** *(Duo)* — alterar modo de privacidade (visível/unificado/privado), com aceite de ambos.
- **MessagingConnectionCard** — vincular WhatsApp e/ou Telegram.
- **PlanCard** — status de assinatura (plano, trial, beta, expirado), mudar plano, abrir portal Stripe.
- **SupportCard** — iniciar tutorial guiado, contato com suporte.
- **DataPrivacyCard** — exportar dados, resetar dados, excluir conta (com fluxo de cancelamento).
- **Logout**.
- **Variações:** Solo (oculta Members/Privacy), beta, em trial, assinatura ativa, assinatura expirada, sem orçamento criado.

### `/app/beta-lab` — Laboratório Beta
**Propósito:** Roadmap público interno + features experimentais.
- Acesso restrito por role (`canAccessBetaLab(user.role)` em `features/roadmap/constants`).
- Badge "Beta" no menu + contador de itens novos não vistos (`/api/app/roadmap/seen`).
- Permite votar, comentar e acompanhar itens do roadmap (rotas em `/api/app/roadmap/*`).

---

## Telas NÃO listadas no menu

Acessadas via deep link, fluxo de assinatura, configurações ou onboarding.

### `/app/profile` — Perfil
- Editar nome completo.
- Upload/troca de avatar (JPG/PNG/GIF, ≤5 MB).
- E-mail (somente leitura).
- Mostra "membro desde" e ID da conta.
- Card de privacidade de dados (excluir conta).
- **Acessada via:** Configurações.

### `/app/categories` — Categorias
- Listar categorias por tipo (despesa/receita/investimento).
- Criar/editar/excluir/reordenar.
- Validação de uso ao excluir.
- **Acessada via:** deep link / Configurações.

### `/app/income` — Receitas / fontes de renda
- Listar fontes de renda.
- Criar/editar/excluir com valor e frequência.
- Sincroniza com categorias de receita.
- **Acessada via:** deep link.

### `/app/plan` — Plano e cobrança
- Mostra plano atual, status (ativo, trial, beta, expirado) e dias de trial restantes.
- Botão para abrir o portal Stripe (`/app/billing`).
- Atalho para suporte.
- **Acessada via:** Configurações → PlanCard.

### `/app/billing` — Atalho para o portal Stripe
- **Tipo:** Route handler (`route.ts`), não é página renderizável.
- Cria sessão do Stripe Billing Portal e redireciona para `customer.portal.url`.
- Se o usuário não tem `stripeCustomerId`, retorna JSON `"You are not subscribed to any plan."` (sem UI — vide observação de UX abaixo).

### `/app/setup` — Onboarding inicial
- **Solo:** uma tela com CTA "Começar" → cria orçamento, contas/categorias/rendas padrão, vai para `/app`.
- **Duo:** etapa única `StepPrivacy` (escolher modo de privacidade) → cria orçamento → vai para `/app`.
- **Acessada via:** redirect automático após criar conta + escolher plano.

### `/app/partner-welcome` — Boas-vindas ao parceiro
- Wizard de 3 passos para o segundo membro do plano Duo:
  1. Boas-vindas + explicação do modo de privacidade vigente.
  2. O que já está pronto na conta compartilhada.
  3. Quick start (registrar gasto, conectar WhatsApp/Telegram).
- Marcado em `localStorage` (`hivebudget_partner_welcome_done`) para não repetir.
- **Acessada via:** redirect automático no primeiro acesso de um parceiro convidado.

### `/app/complete-profile` — Capturar nome
- Campo único para nome completo + validação de não-vazio.
- Renderizada **fora do AppShell** (sem sidebar/header).
- **Acessada via:** redirect quando o usuário entrou por magic link e ainda não tem `name`/`displayName`.

### `/app/choose-plan` — Escolha de plano
- Cards Solo vs Duo, toggle Mensal/Anual (até ~20% off), trial de N dias para novos usuários.
- Respeita pré-seleção via query string e auto-redireciona para Stripe (ou ativa direto, em beta).
- Renderizada **fora do AppShell** quando ainda sem assinatura.
- **Acessada via:** redirect automático para usuários sem assinatura.

### `/app/subscribe` (server-only)
- Valida `codename`, `type`, `provider`, `trialPeriodDays`.
- Cria sessão de checkout no Stripe e redireciona.
- Em erro → `/app/subscribe/error`.
- Se já tem assinatura → `/app/billing`.

### `/app/subscribe/success`
- Aguarda confirmação do webhook Stripe (`SuccessRedirector`) e leva para o Dashboard.

### `/app/subscribe/error`
- Mensagens de erro contextuais (`STRIPE_CANCEL_BEFORE_SUBSCRIBING`, `INVALID_PARAMS` etc.).
- CTAs: tentar novamente, abrir cobrança, falar com suporte, voltar.

### `/app/survey/[key]` — Pesquisa dinâmica
- Renderiza um formulário com base em `SURVEY_DEFINITIONS[key]`.
- Detecta resposta prévia e mostra mensagem de "obrigado".
- Key inválido → redireciona para `/app`.
- **Acessada via:** links em e-mails / notificações.

---

## Rotas órfãs / legadas

Candidatas a remoção ou retomada deliberada:

| Rota | Estado atual | Sugestão |
|---|---|---|
| `/app/planning` | `redirect("/app/budget")` | Avaliar se ainda há links externos apontando; senão, remover. |
| `/app/redeem-ltd` | `redirect("/app/plan")` com TODO ("reativar quando implementar LTD"). | Remover ou implementar. |
| `setup/_components/step-budget.tsx`, `step-finances.tsx`, `step-profile.tsx`, `step-quick-start.tsx` | Componentes existem em `_components/`, mas o `setup/page.tsx` atual só usa `step-privacy.tsx`. | Confirmar se foram substituídos pelo flow simplificado e remover, ou retomar wizard completo. |
| `/app/billing` (sem cliente Stripe) | Retorna JSON cru `"You are not subscribed to any plan."` | Substituir por redirect com toast ou página de erro adequada. |

---

## Observações iniciais de UX

Apenas pontos visíveis na arquitetura — não substituem teste com usuário.

1. **Acesso a Categorias e Receitas (`/app/categories`, `/app/income`):** páginas funcionais sem entrada no menu. Para o usuário que não conhece a URL, só são alcançáveis por deep links contextuais. Vale verificar se a descoberta acontece bem dentro do fluxo de Planejamento/Configurações.
2. **Setup Duo é uma única etapa (privacidade):** todo o restante (categorias, contas, rendas) é criado por padrão e só editado depois. Confiar no Dashboard `GettingStartedChecklist` para guiar — vale confirmar se o checklist cobre todos os passos críticos.
3. **Bloqueio "requer conta" no sidebar:** Planejamento, Transações, Metas e Relatórios mostram cadeado se não houver conta. Hoje a conta padrão é criada no setup, então em teoria nunca aparece — vale validar quando isso pode ocorrer (ex.: usuário apaga todas as contas).
4. **Toggle de visão duplicado:** existe um toggle no sidebar (`ViewModeSelector`: Pessoal/Compartilhado/Tudo) e outro no Dashboard (`Compartilhado/Visão completa`) — eles têm semânticas diferentes (filtro de dados vs base de cálculo). Pode confundir.
5. **Onboarding do parceiro depende de `localStorage`:** `hivebudget_partner_welcome_done` não persiste entre dispositivos/navegadores. O parceiro veria o welcome de novo ao trocar de browser.
6. **Renderização fora do `AppShell`:** `/app/complete-profile` e `/app/choose-plan` (sem assinatura) escondem sidebar/header, o que é intencional para evitar distrações, mas significa que o usuário não tem como sair do fluxo (ex.: voltar ao site marketing).
7. **`/app/billing` retorna JSON quando o usuário não tem cliente Stripe** — quebra a expectativa de UI.
8. **Beta Lab tem badge de "novidades não vistas"**, mas os itens listados no sidebar regulares (Planejamento, Transações, etc.) não têm sinalização de novidade — pode ser oportunidade para announcements contextuais.

---

## Resumo

- **23 páginas renderizáveis** + 1 route handler (`/app/billing`) dentro de `(in-app)/app`.
- **8 itens no sidebar** (7 + Beta Lab condicional).
- **15 rotas fora do menu** divididas entre fluxos de onboarding, assinatura, pesquisa e atalhos.
- **3 rotas/áreas legadas** com candidatos claros para limpeza.
