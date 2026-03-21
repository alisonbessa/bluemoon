# Análise Competitiva — HiveBudget

> Data: 21/03/2026 | Análise de concorrentes Brasil e mundo

---

## 1. Mapa Competitivo

### Concorrentes Globais (Apps de Orçamento)

| App | Preço/Ano | Casais | Plataformas | Metodologia | Destaques |
|-----|-----------|--------|-------------|-------------|-----------|
| **YNAB** | $109/ano (~R$650) | YNAB Together (5 pessoas) | Web, iOS, Android | Zero-based (rígida) | Referência global, educação financeira forte |
| **Monarch Money** | $99/ano (~R$595) | Melhor do mercado (meu/seu/nosso) | Web, iOS, Android | Flexível (Flex ou Category) | WSJ "Best Budgeting App", AI Assistant |
| **Copilot Money** | $95/ano (~R$570) | Fraco (link compartilhado) | iOS/Mac only | AI-adaptativo | Design Apple-native premium, ML por usuário |
| **Goodbudget** | $80/ano ou grátis | Bom (envelopes compartilhados) | Web, iOS, Android | Envelope system | Tier gratuito utilizável, simples |

### Concorrentes Brasileiros

| App | Preço | Casais | Open Finance | Destaques |
|-----|-------|--------|-------------|-----------|
| **Mobills** | R$8-16/mês | Sem suporte | Sim (Premium) | 10M+ usuários, líder Brasil, QR Code |
| **Organizze** | R$35-45/mês | Sem suporte | Sim (via Belvo) | 15+ anos, #1 Reclame Aqui 2025 |
| **Jota** (2026) | Grátis | Sem info | Sim (20+ bancos) | AI via WhatsApp, 100% CDI, novo |
| **ZapGastos** | Grátis | Sem info | Não | 100% WhatsApp, ultra simples |
| **GuiaBolso** | Absorvido pelo PicPay | - | Pioneiro | Caso legal que criou Open Finance BR |

### HiveBudget (nós)

| Aspecto | Status |
|---------|--------|
| **Preço** | R$14,90/mês (Solo), R$19,90/mês (Duo) |
| **Casais** | Sim — owner/partner com privacidade |
| **Metodologia** | Budget-first (YNAB-inspired) |
| **Messaging** | Telegram + WhatsApp (AI com Gemini) |
| **Open Finance** | Sem integração |
| **Mobile App** | Web only (responsivo) |
| **Plataformas** | Web |

---

## 2. Onde HiveBudget já é FORTE

### Vantagens competitivas claras:

1. **Foco em casais no Brasil** — Nenhum app brasileiro tem funcionalidade de casais. Mobills, Organizze, ZapGastos são todos individuais. Este é nosso maior diferencial no mercado BR.

2. **Preço competitivo** — R$19,90/mês para casal vs YNAB a ~R$55/mês vs Organizze a R$35-45/mês. Somos 60-70% mais baratos que a maioria.

3. **Integração com messaging (Telegram/WhatsApp)** — Com IA para categorização automática. Apenas ZapGastos e Jota fazem algo similar, mas sem budget-first methodology.

4. **Metodologia budget-first** — Único app brasileiro que implementa o "dar trabalho a cada real" (zero-based budgeting). Todos os concorrentes BR são tracking-after-the-fact.

5. **Gestão de cartão de crédito brasileira** — Data de fechamento, data de vencimento, parcelamento — coisas que o YNAB faz mal.

6. **Parceiro grátis** — No plano Duo, o parceiro não paga nada. No YNAB Together, todos compartilham uma assinatura, mas é mais caro. No Monarch, o partner também é grátis.

---

## 3. GAPS CRÍTICOS — O que falta vs concorrentes

### 3.1 App Mobile Nativo (Prioridade: MUITO ALTA)

**Problema:** HiveBudget é web-only. Todos os concorrentes têm apps nativos.

**Benchmark:**
- YNAB: iOS + Android + Web
- Monarch: iOS + Android + Web
- Mobills: iOS + Android + Web
- Organizze: iOS + Android + Web
- Copilot: iOS + Mac (nativo Apple)

**Impacto:** 66% dos brasileiros usam apps para gestão financeira (Febraban). Sem app nativo, perdemos a maioria do mercado. Registrar gastos na hora é essencial.

**Recomendação:** React Native ou PWA avançado com push notifications. O fluxo de "registrar gasto rápido" precisa de <3 taps.

---

### 3.2 Open Finance / Conexão Bancária (Prioridade: ALTA)

**Problema:** Sem integração com bancos brasileiros. Todas as transações são manuais.

**Benchmark:**
- Mobills: Nubank, Itaú, Caixa, BB, Santander
- Organizze: Open Finance via Belvo (regulado pelo Banco Central)
- Jota: 20+ bancos
- YNAB: Plaid/MX (não funciona no BR)
- Monarch: Plaid (não funciona no BR)

**Contexto:** Open Finance Brasil tem 62M de consentimentos (+44% YoY). É uma expectativa crescente.

**Recomendação:** Integrar via Belvo ou Pluggy (provedores de Open Finance BR). Começar com importação automática de transações dos maiores bancos (Nubank, Itaú, BB, Bradesco).

---

### 3.3 Onboarding Guiado (Prioridade: ALTA)

**Problema:** O YNAB é criticado por ter curva de aprendizado de 2-3 meses. Se HiveBudget usa metodologia similar, precisa de onboarding superior.

**Benchmark:**
- YNAB: Educação forte (vídeos, workshops ao vivo, artigos), mas UX de onboarding é fraca
- Copilot: Setup automático via AI — quase zero configuração manual
- Monarch: Setup guiado de 2-3h (longo demais)

**Recomendação:**
- Wizard de setup em 5 passos: contas → renda → categorias → primeira alocação → primeiro gasto
- Templates de orçamento pré-configurados (ex: "Casal sem filhos", "Família com 2 filhos", "Solteiro universitário")
- Tooltip tour interativo na primeira sessão
- Gamificação leve: "Parabéns, você alocou seu primeiro mês!"

---

### 3.4 Relatórios e Insights Avançados (Prioridade: MÉDIA-ALTA)

**Problema:** Dashboard básico com poucos insights acionáveis.

**Benchmark:**
- YNAB Spotlight (2025): Dashboard que mostra "o que precisa de atenção" + progresso
- Monarch AI Assistant: Perguntas em linguagem natural sobre seus dados
- Copilot: Cash flow visualization, trend comparison mês-a-mês
- Mobills: Gráficos customizáveis, filtros avançados por categoria/tag

**Recomendação:**
- "Insight da semana" via push/email: "Vocês gastaram 30% mais em restaurantes este mês"
- Comparação mês-a-mês por categoria
- Previsão de saldo (forecast) baseado em recorrências
- Score de saúde financeira do casal
- Relatório mensal automático para conversa do casal (como Monarch faz)

---

### 3.5 AI mais Inteligente (Prioridade: MÉDIA)

**Problema:** A IA atual só processa mensagens de Telegram/WhatsApp. Concorrentes usam AI em mais pontos.

**Benchmark:**
- YNAB: Clean Vendor Names (AI), AI support agent (70% deflection)
- Copilot: ML model por usuário (~90% accuracy), Adaptive Budgets
- Monarch: AI Assistant para perguntas sobre dados financeiros
- Jota: AI via WhatsApp para tudo (recomendações, alertas)

**Recomendação:**
- Auto-categorização inteligente que aprende com o histórico
- AI chat dentro do app: "Quanto gastamos em mercado nos últimos 3 meses?"
- Sugestões de alocação baseadas em padrões de gasto
- Alertas proativos: "Categoria X está 80% utilizada e faltam 15 dias"
- "Limpeza" automática de nomes de transações (como YNAB Clean Vendor Names)

---

### 3.6 Features de Casal Avançadas (Prioridade: MÉDIA)

**Problema:** Temos o básico (owner/partner), mas Monarch é o benchmark de ouro.

**Benchmark Monarch Money:**
- Labels "meu", "seu", "nosso" em contas e transações
- Esconder transações individuais (ícone de olho) — para presentes
- Dashboards customizáveis por parceiro
- Credit score de ambos
- Relatório mensal conjunto para discussão

**Benchmark YNAB Together:**
- 3 orçamentos: meu, seu, nosso (abordagem completa)
- "Recent Moves" — quem mudou o quê em tempo real
- 5 colaboradores (família extendida)

**Recomendação:**
- Modo "surpresa" para esconder transações (presentes)
- Activity feed: "João adicionou gasto de R$50 em Restaurantes"
- Relatório mensal do casal (email automático)
- Dashboard com visão "eu" vs "nós" vs "parceiro"
- Notificações configuráveis: alertar quando parceiro gasta acima de X

---

### 3.7 Exportação e Importação de Dados (Prioridade: MÉDIA-BAIXA)

**Benchmark:**
- Mobills: Excel, OFX, PDF export/import
- YNAB: CSV import/export
- Organizze: OFX/CSV import

**Recomendação:**
- Import de OFX/CSV (para migração de outros apps)
- Export PDF/Excel para contador
- Backup completo dos dados

---

## 4. UX Improvements — Quick Wins

### 4.1 Registro Rápido de Gastos
- **Problema:** Precisa navegar até transações para registrar
- **Solução:** Botão flutuante (FAB) "+" sempre visível, shortcut de teclado, widget mobile

### 4.2 Progresso Visual nas Categorias
- **Problema:** Barras de progresso simples
- **Solução:** Gauge visual (como YNAB), cores dinâmicas (verde→amarelo→vermelho), animações sutis

### 4.3 Notificações e Alertas
- **Problema:** Sem sistema de alertas proativos
- **Solução:**
  - Push/email quando categoria atinge 80%
  - Lembrete de alocação no início do mês
  - Resumo semanal por email
  - Alerta de fatura de cartão próxima do vencimento

### 4.4 Dark Mode
- **Problema:** Não identificado se existe
- **Solução:** Dark mode é esperado em 2026. Mobills e todos os concorrentes globais oferecem.

### 4.5 Atalhos de Teclado
- **Problema:** Sem power-user features
- **Solução:** Cmd+N para nova transação, Cmd+K para command palette, navegação por teclado

---

## 5. Matriz de Priorização

| Feature | Impacto | Esforço | Prioridade |
|---------|---------|---------|------------|
| App Mobile (PWA/Nativo) | Muito Alto | Alto | P0 |
| Open Finance BR | Alto | Alto | P1 |
| Onboarding guiado + templates | Alto | Médio | P1 |
| Relatórios avançados + insights | Alto | Médio | P1 |
| Quick-add gasto (FAB button) | Médio | Baixo | P2 |
| Notificações/alertas proativos | Médio | Médio | P2 |
| AI Chat / categorização inteligente | Médio | Alto | P2 |
| Features de casal avançadas | Médio | Médio | P2 |
| Dark mode | Baixo | Baixo | P3 |
| Import/Export (OFX, CSV, PDF) | Baixo | Médio | P3 |
| Atalhos de teclado | Baixo | Baixo | P3 |

---

## 6. Oportunidades Estratégicas

### 6.1 "O YNAB Brasileiro para Casais"
Nenhum concorrente brasileiro combina budget-first + casais + messaging. Manter e fortalecer esta posição.

### 6.2 Open Finance como Diferenciador
Se integrarmos Open Finance mantendo a metodologia budget-first, seremos o único app BR que combina planejamento proativo com dados automáticos.

### 6.3 WhatsApp como Canal Principal
78% dos brasileiros usam WhatsApp diariamente. ZapGastos e Jota provaram o modelo. Nossa integração já existe — investir para torná-la o canal principal de entrada de dados.

### 6.4 Plano Família (expansão)
Nenhum concorrente BR atende famílias. YNAB Together suporta 5 pessoas. Criar plano "Família" (R$29,90/mês, até 5 membros) seria expansão natural.

### 6.5 Conteúdo Educacional
YNAB gasta ~30% do orçamento em educação (workshops, blog, YouTube). Criar conteúdo em PT-BR sobre finanças para casais é um canal de aquisição inexplorado no Brasil.

---

## 7. Resumo Executivo

**Posição atual:** HiveBudget ocupa um nicho vazio no Brasil — app de orçamento budget-first para casais com integração messaging. Nenhum concorrente BR oferece isso.

**Maiores riscos:**
1. Falta de app mobile afasta maioria dos usuários potenciais
2. Sem Open Finance, a fricção de entrada manual é alta demais
3. Concorrentes globais (YNAB, Monarch) podem eventualmente localizar para BR

**Maiores oportunidades:**
1. Primeiro a combinar Open Finance + Budget-first + Casais no BR
2. WhatsApp como interface primária de input (direção do mercado BR)
3. Plano Família como expansão natural
4. Conteúdo educacional em PT-BR é canal de aquisição inexplorado

**Meta de 12 meses:** PWA/app mobile + Open Finance + onboarding guiado → posicionar como "o YNAB brasileiro que funciona de verdade para casais".
