# Plano de Melhorias Práticas — HiveBudget

> Data: 22/03/2026 | Baseado na análise competitiva e estado atual do app

---

## Decisões Estratégicas

- **Sem app mobile por agora** — WhatsApp é o canal principal de input
- **Open Finance** — analisar viabilidade (custo/complexidade) abaixo
- **Foco:** Onboarding, Relatórios/Insights, e melhorias práticas inspiradas no Monarch

---

## 1. Open Finance — Análise de Viabilidade

### Provedores disponíveis no Brasil

| Provedor | Cobertura | Preço | Obs |
|----------|-----------|-------|-----|
| **Pluggy** | ~90% dos bancos BR | Free tier + custom pricing (contato comercial) | Y Combinator, focada 100% no Brasil, regulada pelo BCB |
| **Belvo** | Brasil + LATAM | Sandbox grátis (25 conexões) → tiers Startup/Growth/Enterprise | Adquirida pela Visa em 2024, mais robusta mas possivelmente mais cara |

### O que a integração daria ao usuário

1. **Importação automática de transações** — acabar com a entrada manual
2. **Saldos atualizados** — ver saldo real das contas conectadas
3. **Categorização automática** — combinar com IA para classificar transações importadas
4. **Reconciliação** — cruzar transações manuais com importadas

### Custos estimados (baseado em pesquisa pública)

Os dois provedores não publicam preços exatos. O modelo é geralmente:

- **Custo por conexão/mês** — cada usuário conectado a um banco = 1 conexão
- **Tiers baseados em volume** — mais conexões = preço unitário menor
- **Sandbox gratuito** — ambos oferecem teste grátis (Belvo: 25 conexões, Pluggy: 2 semanas)

**Estimativa de custo operacional:**
- Se cobrarmos R$19,90/mês (plano Duo) e a conexão Open Finance custar ~R$2-5/usuário/mês, é viável como feature premium
- Risco: se custar mais que R$5/conexão, impacta a margem significativamente

### Complexidade técnica

| Aspecto | Dificuldade | Detalhes |
|---------|------------|---------|
| Integração da API | Média | SDKs bem documentados (Pluggy tem SDK JS/TS) |
| Widget de conexão | Baixa | Ambos fornecem widget de autenticação pronto (Pluggy Connect / Belvo Connect) |
| Processamento de transações | Alta | Matching de transações importadas com categorias existentes, deduplicação, reconciliação |
| Consentimento/LGPD | Média | Requer fluxo de consentimento do usuário conforme regulação do BCB |
| Manutenção | Alta | Conexões quebram (reconexão), bancos mudam APIs, suporte ao usuário |

### Recomendação

**Adiar para fase 2.** Razões:
1. Custo por conexão impacta margem em plano de R$19,90
2. Complexidade de manutenção alta (conexões quebrando, suporte)
3. WhatsApp + entrada manual já resolve o problema de fricção de forma mais barata
4. Melhor investir primeiro em onboarding e relatórios (impacto alto, custo baixo)

**Quando fizer sentido:** Após atingir 1.000+ usuários pagantes, negociar volume com Pluggy. Implementar como feature premium do plano Duo/Família.

---

## 2. Melhorias no Onboarding

### Estado atual
- Modal de onboarding que coleta tudo de uma vez (nome, membros, moradia, transporte, contas, despesas, dívidas, metas)
- Tutorial novo planejado (spotlight overlays) mas não implementado
- Não tem templates de orçamento prontos

### O que os concorrentes fazem melhor

| Concorrente | Abordagem | O que podemos copiar |
|-------------|-----------|---------------------|
| **Copilot** | Setup quase zero — AI cria tudo automaticamente | AI sugerir categorias/alocações com base nas respostas |
| **YNAB** | Educação forte, mas onboarding confuso | Não copiar — fazer o contrário (prático, não educativo no setup) |
| **Monarch** | Setup guiado mas longo (2-3h) | Não copiar — muito longo, desiste |
| **Goodbudget** | Simples — escolhe envelopes e começa | Simplicidade do primeiro uso |

### Melhorias práticas propostas

#### 2.1 Templates de Orçamento Prontos (Impacto: ALTO, Esforço: MÉDIO)

Ao invés de pedir cada detalhe no onboarding, oferecer templates:

| Template | Categorias pré-configuradas | Alocações sugeridas |
|----------|---------------------------|-------------------|
| **Casal sem filhos** | Moradia, Alimentação, Transporte, Lazer, Restaurantes, Compras, Saúde, Pets | Baseado em renda informada |
| **Casal com filhos** | + Escola, Atividades infantis, Pediatra, Fraldas/Roupas | Ajustado para família |
| **Solteiro(a)** | Moradia, Alimentação, Transporte, Lazer, Educação, Saúde | Versão enxuta |
| **Universitário(a)** | Moradia, Alimentação, Transporte, Materiais, Lazer | Budget mínimo |

**Implementação:**
- Tela 1: "Qual é o seu perfil?" → seleciona template
- Tela 2: "Qual a renda mensal do casal?" → distribui proporcionalmente
- Tela 3: "Revisão rápida" → ajustar categorias/valores se quiser
- Pronto — budget criado com categorias, grupos e alocações iniciais

#### 2.2 Simplificar o Modal Atual (Impacto: ALTO, Esforço: BAIXO)

O onboarding atual pede muita informação de uma vez. Simplificar para 3 passos:

1. **Quem é você?** → Nome, se tem parceiro(a), perfil (template)
2. **Suas contas** → Banco principal + cartão principal (mínimo viável)
3. **Sua renda** → Salário(s) do casal

Tudo o resto (metas, dívidas, despesas detalhadas) deve ser configurado **depois**, dentro do app, com prompts contextuais.

#### 2.3 "Primeira Semana" Guiada (Impacto: MÉDIO, Esforço: MÉDIO)

Após o onboarding, guiar o usuário nos primeiros 7 dias:

- **Dia 1:** "Registre seu primeiro gasto" → highlight no botão de nova transação
- **Dia 2:** "Confira suas categorias" → link para página de budget
- **Dia 3:** "Conecte o WhatsApp" → atalho para configuração
- **Dia 5:** "Veja como está indo" → link para dashboard
- **Dia 7:** "Primeiro relatório" → insights da semana

Implementar como checklist no dashboard (tipo Notion/Linear onboarding).

#### 2.4 Onboarding do Parceiro(a) (Impacto: ALTO, Esforço: BAIXO)

Quando o parceiro aceita o convite, precisa de onboarding próprio:
- Explicar o que é budget-first em 2 telas
- Mostrar as categorias já configuradas
- Configurar WhatsApp/Telegram
- Primeiro gasto guiado

---

## 3. Melhorias em Relatórios e Insights

### Estado atual
- Dashboard: cards de saldo/receita/despesa, gráfico diário, top 5 metas, gastos no cartão
- Insights: cards de resumo, saúde do budget, comparação mensal, top categorias
- Sem filtros avançados, sem export, sem forecast, sem drill-down

### O que os concorrentes fazem melhor

| Feature | Quem faz | O que copiar |
|---------|----------|-------------|
| **Spotlight** (o que precisa de atenção) | YNAB | Card "Atenção" no dashboard com categorias estouradas e contas a pagar |
| **Cash flow forecast** | Copilot | Gráfico de projeção de saldo baseado em recorrências |
| **AI Assistant** (perguntas em linguagem natural) | Monarch | Via WhatsApp: "quanto gastamos em mercado este mês?" |
| **Comparação mês-a-mês** | Copilot, Mobills | Gráfico de barras comparando meses por categoria |
| **Spending Breakdown** | YNAB, Mobills | Treemap ou donut chart detalhado por subcategoria |
| **Relatório mensal do casal** | Monarch | Email automático com resumo para conversa |

### Melhorias práticas propostas

#### 3.1 Card "Atenção" no Dashboard (Impacto: ALTO, Esforço: BAIXO)

Inspirado no YNAB Spotlight. Card no topo do dashboard mostrando:
- Categorias acima de 80% do orçado
- Faturas de cartão próximas do vencimento (5 dias)
- Contas recorrentes pendentes
- Metas atrasadas (progresso abaixo do esperado para a data)

Não é feature nova — é agregar dados que já existem de forma inteligente.

#### 3.2 Forecast de Saldo (Impacto: ALTO, Esforço: MÉDIO)

Gráfico de linha mostrando projeção dos próximos 30 dias:
- Linha base: saldo atual
- Receitas futuras (income sources + frequência)
- Despesas recorrentes (recurring bills)
- Projeção de gastos variáveis (média dos últimos 3 meses)

Dados necessários já existem no banco (income_sources, recurring_bills, transactions históricas).

#### 3.3 Comparação Mês-a-Mês por Categoria (Impacto: MÉDIO, Esforço: BAIXO)

Na página de insights, adicionar:
- Gráfico de barras: gastos por categoria no mês atual vs mês anterior
- Highlight de variações significativas (>20%): "Restaurantes: +35% vs mês passado"
- Filtro por grupo (Essencial, Estilo de vida, Prazeres, etc.)

#### 3.4 Insights via WhatsApp (Impacto: ALTO, Esforço: MÉDIO)

Aproveitar a integração WhatsApp existente para enviar insights proativos:
- **Resumo semanal** (domingo à noite): gastos da semana, % do orçamento usado, alerta de categorias
- **Alerta de limite** (quando categoria atinge 80%): "Vocês gastaram R$400 de R$500 em Restaurantes"
- **Resumo mensal** (dia 1): relatório completo do mês anterior com highlights

Isso transforma o WhatsApp de canal de input para canal bidirecional.

#### 3.5 Relatório Mensal do Casal (Impacto: MÉDIO, Esforço: MÉDIO)

Inspirado no Monarch. Email automático no dia 1 de cada mês para ambos:
- Total gasto vs orçado
- Top 5 categorias de gasto
- Metas: progresso vs esperado
- "Economizamos R$X este mês" ou "Gastamos R$X a mais"
- CTA: "Abrir relatório completo"

#### 3.6 Drill-down em Categorias (Impacto: MÉDIO, Esforço: BAIXO)

Clicar em uma categoria no dashboard/insights deve abrir:
- Lista de transações daquela categoria no mês
- Gráfico de tendência (últimos 6 meses)
- Quem gastou mais (split por membro)
- Média mensal

---

## 4. Melhorias Inspiradas no Monarch e Concorrentes

### 4.1 Modo "Surpresa" para Transações (Impacto: BAIXO, Esforço: BAIXO)

Botão de "olho" nas transações para esconder do parceiro(a). Útil para presentes.
- Schema já suporta privacy levels
- Implementar toggle visual simples

### 4.2 Activity Feed (Impacto: MÉDIO, Esforço: MÉDIO)

Feed no dashboard mostrando ações recentes de ambos:
- "Maria adicionou R$50 em Restaurantes"
- "João alocou R$200 para Meta: Viagem"
- "Maria pagou fatura do Nubank"

Dados de audit_log já existem no schema.

### 4.3 Quick-Add de Transação (Impacto: ALTO, Esforço: BAIXO)

Botão flutuante (FAB) "+" sempre visível no app:
- Abre modal de transação rápida
- Campos: valor, categoria (dropdown), descrição (opcional)
- 3 taps para registrar um gasto
- Atalho de teclado: Cmd/Ctrl+N

### 4.4 Notificações Configuráveis (Impacto: MÉDIO, Esforço: MÉDIO)

Tela de configuração onde cada parceiro escolhe:
- Alertar quando parceiro gastar acima de R$___
- Alerta de categoria acima de ___% do orçado
- Resumo diário/semanal/mensal
- Canal: email, WhatsApp, ou ambos

### 4.5 Dashboard com Toggle "Eu" / "Nós" / "Parceiro" (Impacto: ALTO, Esforço: MÉDIO)

Inspirado no Monarch (mine/yours/ours):
- Toggle no topo do dashboard
- "Eu": só meus gastos, meu budget pessoal (Prazeres), minhas metas
- "Nós": gastos compartilhados, budget conjunto, metas do casal
- "Parceiro": visão dos gastos do parceiro (se privacidade permitir)

O schema já suporta isso (memberId em transações e categorias).

---

## 5. Matriz de Priorização (Atualizada)

Considerando que **não teremos app mobile** e que **Open Finance fica para depois**:

### P0 — Fazer agora (alto impacto, esforço viável)
| Melhoria | Impacto | Esforço | Detalhes |
|----------|---------|---------|----------|
| Templates de orçamento no onboarding | Alto | Médio | 4 templates pré-configurados |
| Simplificar onboarding para 3 passos | Alto | Baixo | Reduzir modal atual |
| Card "Atenção" no dashboard | Alto | Baixo | Agregar dados existentes |
| Quick-Add transação (FAB) | Alto | Baixo | Modal rápido + atalho teclado |
| Completar integração WhatsApp | Alto | Alto | Processar mensagens, criar transações |

### P1 — Próximo ciclo (alto impacto, esforço maior)
| Melhoria | Impacto | Esforço | Detalhes |
|----------|---------|---------|----------|
| Forecast de saldo | Alto | Médio | Gráfico de projeção 30 dias |
| Insights via WhatsApp | Alto | Médio | Resumos semanais + alertas |
| Dashboard "Eu/Nós/Parceiro" | Alto | Médio | Toggle de visão |
| Comparação mês-a-mês | Médio | Baixo | Gráfico de barras comparativo |
| Onboarding do parceiro | Alto | Baixo | Fluxo dedicado |

### P2 — Melhorias contínuas
| Melhoria | Impacto | Esforço | Detalhes |
|----------|---------|---------|----------|
| Relatório mensal do casal (email) | Médio | Médio | Automático dia 1 |
| Activity feed | Médio | Médio | Usar audit_log existente |
| Drill-down categorias | Médio | Baixo | Clique em categoria → detalhes |
| Notificações configuráveis | Médio | Médio | Tela de preferências |
| "Primeira semana" guiada | Médio | Médio | Checklist no dashboard |
| Modo surpresa (esconder transação) | Baixo | Baixo | Toggle de visibilidade |

### P3 — Futuro (quando tiver base de usuários)
| Melhoria | Impacto | Esforço | Detalhes |
|----------|---------|---------|----------|
| Open Finance (Pluggy/Belvo) | Alto | Muito Alto | Após 1000+ usuários pagantes |
| AI Chat no app | Médio | Alto | "Quanto gastamos em X?" |
| Import/Export (OFX, CSV, PDF) | Baixo | Médio | Para migração e contador |
| Plano Família (5 membros) | Médio | Médio | Expansão natural |

---

## 6. Resumo

### Filosofia: Simples e Completo

1. **WhatsApp é o "app mobile"** — investir pesado na integração bidirecional
2. **Onboarding em 3 passos + template** — ninguém quer responder 10 perguntas
3. **Dashboard que mostra o que importa** — card de atenção + forecast
4. **Insights que chegam ao usuário** — via WhatsApp, não só dentro do app
5. **Casal é o diferencial** — toggle Eu/Nós/Parceiro, activity feed, relatório conjunto

### O que NÃO fazer agora
- Open Finance (custo alto, manutenção pesada)
- App mobile nativo (WhatsApp substitui)
- AI chat no app (via WhatsApp é mais simples)
- Gamificação complexa (badges, conquistas)
- Multi-moeda, subcategorias
