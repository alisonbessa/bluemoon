# HiveBudget

**Documentação de Funcionalidades e Telas**

Versão 2.0 - Arquitetura Simplificada | Novembro 2025

---

## 1. Visão Geral

O HiveBudget é uma plataforma de gestão financeira pessoal e familiar, inspirada no YNAB mas adaptada para o contexto brasileiro. O sistema permite que indivíduos ou casais gerenciem suas finanças de forma colaborativa, com suporte a parcelamentos, múltiplos cartões de crédito com datas de virada/vencimento, e entrada de gastos via Telegram.

### 1.1 Princípios Fundamentais

- **Dar trabalho a cada real:** Todo dinheiro deve ter uma categoria atribuída
- **Abraçar as despesas reais:** Preparar-se para gastos irregulares
- **Ser flexível:** Ajustar o orçamento conforme a vida acontece
- **Envelhecer o dinheiro:** Gastar o dinheiro do mês passado

### 1.2 Diferenciais Brasileiros

- Suporte completo a cartões de crédito com data de fechamento e vencimento
- Gestão de parcelamentos com acompanhamento de parcelas restantes
- Integração com Telegram para registro rápido de gastos via mensagem
- IA para processar mensagens em linguagem natural

---

## 2. Modelo de Dados

A arquitetura foi simplificada para remover o conceito de "Hives" e centralizar tudo em "Budgets" (orçamentos).

### 2.1 Entidades Principais

| Entidade | Descrição |
|----------|-----------|
| **Budget** | Orçamento principal. Pode ser individual ou compartilhado entre casal. Contém todas as categorias, contas e transações. |
| **Budget Member** | Membro do orçamento. Tipos: owner (dono), partner (parceiro), child (filho), pet (animal). |
| **Group** | Grupo fixo de categorias (não editável). Cinco grupos: Essencial, Estilo de Vida, Prazeres, Investimentos, Metas. |
| **Category** | Categoria dentro de um grupo. Possui valor planejado e comportamento (set_aside ou refill_up). |
| **Account** | Conta financeira: corrente, poupança, cartão de crédito, dinheiro ou investimento. |
| **Transaction** | Transação financeira: receita, despesa ou transferência. Associada a categoria e membro. |
| **Invite** | Convite pendente para um parceiro entrar no orçamento. |

### 2.2 Grupos de Categorias (Fixos)

Os grupos são pré-definidos e não podem ser alterados pelo usuário:

| 🎨 | Grupo | Descrição |
|----|-------|-----------|
| 📌 | **Essencial** | Gastos fixos e obrigatórios: moradia, contas, mercado, transporte, saúde, educação |
| 🎨 | **Estilo de Vida** | Gastos variáveis de qualidade de vida: alimentação fora, vestuário, streaming, academia |
| 🎉 | **Prazeres** | Diversão pessoal de cada membro. Cada pessoa tem sua própria subcategoria. |
| 💰 | **Investimentos** | Reservas e aplicações: emergência, previdência, poupança, investimentos |
| 🎯 | **Metas** | Sonhos e objetivos com prazo: viagem, carro, casa, casamento |

### 2.3 Comportamentos de Categoria

- **Set Aside (Reservar):** Valor fixo mensal que acumula se não usado. Ideal para contas fixas e metas.
- **Refill Up (Reabastecer):** Valor reposto até o limite todo mês. Ideal para mercado, transporte variável.

---

## 3. Fluxos de Usuário

### 3.1 Onboarding - Novo Usuário

O onboarding é guiado por perguntas que personalizam o orçamento:

1. **Tipo de uso:** "Você vai usar sozinho(a) ou com parceiro(a)?" → Define se mostra opções de compartilhamento
2. **Renda mensal:** "Qual sua renda mensal aproximada?" → Sugere proporções para categorias
3. **Moradia:** "Você paga aluguel, financiamento ou mora de graça?" → Cria categoria apropriada
4. **Transporte:** "Você usa carro próprio, transporte público ou aplicativo?" → Define categorias de transporte
5. **Dependentes:** "Você tem filhos ou pets?" → Cria membros dependentes com categoria de prazeres
6. **Metas:** "Tem algum sonho que quer realizar?" → Cria categorias no grupo Metas
7. **Alocação:** Usuário define quanto quer alocar para cada categoria sugerida

### 3.2 Convidar Parceiro(a)

Fluxo para adicionar parceiro ao orçamento:

1. Owner acessa Configurações → Compartilhamento
2. Digita email do parceiro e envia convite
3. Sistema envia email com link mágico (expira em 7 dias)
4. Parceiro clica no link → cria conta ou faz login
5. Parceiro aceita convite → vira membro com tipo "partner"
6. Sistema cria categoria de Prazeres pessoal para o novo membro

### 3.3 Adicionar Dependente

Para filhos ou pets (sem login):

1. Owner acessa Configurações → Compartilhamento → Adicionar Dependente
2. Preenche: nome, tipo (filho/pet), cor, valor mensal de prazeres
3. Sistema cria budget_member sem user_id e categoria de Prazeres

### 3.4 Registrar Gasto via Telegram

Entrada rápida de transações:

1. Usuário envia mensagem para o bot: "gastei 50 no mercado"
2. IA processa: extrai valor (50), categoria (Mercado), data (hoje)
3. Bot confirma: "Registrado: R$ 50,00 em Mercado. Restam R$ 450 no mês."
4. Usuário pode corrigir respondendo: "não, era restaurante"

---

## 4. Telas do Sistema

### 4.1 Dashboard Principal

Visão simplificada do mês atual:

- **Resumo do mês:** Receitas, despesas, saldo disponível para alocar
- **Categorias com problemas:** Destacar categorias estouradas ou próximas do limite
- **Próximos vencimentos:** Faturas de cartão, contas fixas
- **Seletor de mês:** Navegar entre meses anteriores e futuros

### 4.2 Planejamento (Budget)

Tela principal de orçamento, organizada por grupos:

- **Lista de grupos:** Essencial, Estilo de Vida, Prazeres, Investimentos, Metas
- **Cada grupo expande:** Mostra categorias com planejado, gasto e disponível
- **Barra de progresso:** Visual de quanto foi gasto vs planejado
- **Ações rápidas:** Editar valor planejado, mover dinheiro entre categorias

### 4.3 Transações

Lista e gerenciamento de transações:

- **Lista cronológica:** Transações agrupadas por dia
- **Filtros:** Por conta, categoria, membro, período, tipo
- **Cada transação mostra:** Valor, descrição, categoria, conta, quem registrou
- **Modal de nova transação:** Tipo, valor, descrição, data, categoria, conta, parcelas

### 4.4 Contas

Gestão de contas bancárias e cartões:

- **Lista de contas:** Com saldo atual e tipo
- **Cartões de crédito:** Limite, fatura atual, data de fechamento e vencimento
- **Reconciliação:** Ajustar saldo real vs sistema
- **Transferências:** Entre contas do mesmo budget

### 4.5 Configurações de Compartilhamento

Gerenciamento de membros do orçamento:

- **Membros atuais:** Lista com tipo, nome, email (se tiver conta)
- **Convites pendentes:** Com opção de reenviar ou cancelar
- **Convidar parceiro:** Formulário com email e nome
- **Adicionar dependente:** Modal para criar filho ou pet

### 4.6 Relatórios

Análises e insights:

- **Gastos por categoria:** Gráfico de pizza ou barras
- **Evolução mensal:** Comparativo dos últimos meses
- **Gastos por membro:** Quem está gastando quanto
- **Tendências:** Categorias que estão aumentando ou diminuindo

---

## 5. Cartão de Crédito - Modelo Brasileiro

### 5.1 Conceitos

- **Data de fechamento:** Dia em que a fatura "vira". Compras após essa data vão para a próxima fatura.
- **Data de vencimento:** Dia em que a fatura deve ser paga.
- **Ciclo da fatura:** Período entre um fechamento e outro.

### 5.2 Fluxo de Parcelamento

Exemplo: Compra de R$ 1.200 em 12x no dia 10/nov, cartão fecha dia 15:

1. Compra registrada: R$ 1.200, 12 parcelas de R$ 100
2. Fatura nov (vence dez): inclui 1ª parcela (R$ 100)
3. Faturas dez-out seguintes: R$ 100 cada
4. Orçamento: cada mês tem R$ 100 na categoria correspondente

### 5.3 Campos do Cartão

- Nome (ex: "Nubank")
- Limite total
- Dia de fechamento (1-31)
- Dia de vencimento (1-31)
- Cor para identificação

---

## 6. Integrações

### 6.1 Telegram Bot

Bot para entrada rápida de gastos via mensagem:

- **Registro de gastos:** "gastei 50 no mercado", "almocei 35 no nubank"
- **Consultas:** "quanto sobrou de mercado?", "resumo do mês"
- **Correções:** Responder mensagem anterior para corrigir
- **Vinculação:** Usuário conecta Telegram na área de configurações

### 6.2 IA (Google Gemini)

Processamento de linguagem natural para:

- Extrair valor, descrição, data, categoria de mensagens livres
- Identificar conta/cartão mencionado
- Detectar parcelamentos
- Identificar gastos recorrentes

### 6.3 Outras Integrações

- **Resend:** Envio de emails (convites, relatórios)
- **Stripe:** Pagamentos e assinaturas (se houver plano pago)
- **Sentry:** Monitoramento de erros
- **PostHog:** Analytics e feature flags
- **Inngest:** Jobs em background (emails, relatórios)

---

## 7. Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Banco de Dados** | PostgreSQL (Neon) + Drizzle ORM |
| **Autenticação** | NextAuth.js com Google OAuth |
| **UI** | Tailwind CSS + shadcn/ui |
| **Deploy** | Vercel |
| **Storage** | Vercel Blob |
| **IA** | Google Gemini |

---

## 8. Roadmap de Desenvolvimento

### Fase 1 - MVP Core

- Criar novo projeto com IndieKit template
- Implementar schema simplificado (budgets, members, groups, categories)
- Auth com criação automática de budget
- Onboarding básico
- Dashboard e tela de planejamento

### Fase 2 - Compartilhamento

- Sistema de convites
- Gestão de membros e dependentes
- Categorias de prazeres por membro

### Fase 3 - Transações

- CRUD de transações
- Parcelamentos
- Cartões de crédito com ciclo de fatura

### Fase 4 - Telegram

- Bot de Telegram
- Integração com Gemini para NLP
- Vinculação de conta

### Fase 5 - Relatórios e Polish

- Relatórios e gráficos
- Refinamento de UX
- Performance e otimizações