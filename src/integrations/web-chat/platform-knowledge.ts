/**
 * Platform knowledge base for the AI chatbot.
 * Contains instructions about all HiveBudget features so the AI can answer user questions.
 */

export const PLATFORM_KNOWLEDGE = `
# HiveBudget - Guia Completo da Plataforma

O HiveBudget é uma plataforma de gestão financeira pessoal e para casais. Abaixo estão todas as funcionalidades e como utilizá-las.

---

## NAVEGAÇÃO PRINCIPAL

O menu lateral (sidebar) tem as seguintes opções:
- Dashboard (página inicial)
- Planejamento (orçamento mensal)
- Transações (lista de gastos e receitas)
- Metas (objetivos de economia)
- Contas (contas bancárias, cartões, etc.)
- Relatórios (análises e gráficos)
- Configurações

---

## 1. DASHBOARD (/app)

A tela inicial mostra um resumo financeiro do mês:
- Cards de resumo: Saldo mensal, Receitas recebidas, Despesas totais
- Gráficos: Tendência de gastos diários, comparativo mensal, gastos por categoria
- Widget de transações agendadas: mostra contas e receitas pendentes com botão para confirmar rapidamente
- Progresso das metas ativas
- Acompanhamento de cartões de crédito: saldo e fatura atual
- Checklist de primeiros passos (para novos usuários)
- Para planos Duo: saldo de despesas compartilhadas (quem deve para quem)

Para ver dados de meses anteriores, use o seletor de período no topo da página.

---

## 2. PLANEJAMENTO / ORÇAMENTO (/app/budget)

Permite planejar quanto gastar em cada categoria por mês.

### Como funciona:
- Organizado em 3 seções: Receitas, Despesas e Metas
- Cada categoria tem um valor planejado (orçamento) e mostra quanto já foi gasto
- Barra de progresso mostra a porcentagem utilizada

### Receitas (Fontes de renda):
- Cadastre fontes como Salário, Freelance, VR, VA, etc.
- Cada fonte tem nome, tipo e valor mensal
- Para planos Duo (casal), cada membro pode ter suas próprias fontes
- Modelo de contribuição: em planos Duo, é possível definir quanto cada membro contribui para o orçamento compartilhado

### Despesas (Categorias):
- As categorias são organizadas em grupos (ex: Moradia, Alimentação, Transporte)
- Cada categoria tem um valor planejado por mês e mostra barra de progresso de utilização
- É possível criar novas categorias e novos grupos
- Para copiar alocações de um mês anterior, use o botão "Copiar alocações"
- Dois tipos de comportamento:
  - Recorrente: o orçamento zera todo mês
  - Acumulativa (Set Aside): o saldo não utilizado é transferido para o próximo mês
- Contas recorrentes (luz, aluguel, etc.) podem ser configuradas dentro de cada categoria

### Como criar uma nova categoria:
1. Na página de Planejamento, clique em "+ Categoria" dentro do grupo desejado
2. Dê um nome, escolha um ícone e defina o valor planejado
3. Clique em Salvar

### Como definir o orçamento de uma categoria:
1. Na página de Planejamento, clique no valor ao lado da categoria
2. Digite o novo valor planejado
3. O valor é salvo automaticamente

---

## 3. TRANSAÇÕES (/app/transactions)

Lista todas as transações (gastos, receitas e transferências).

### Como registrar um novo gasto:
1. Clique no botão "+ Transação" (canto superior ou botão flutuante)
2. Selecione o tipo: Despesa
3. Preencha: valor, descrição (opcional), categoria, conta, data
4. Para parcelamento: marque "Parcelado" e informe o número de parcelas
5. Clique em Salvar

### Como registrar uma nova receita:
1. Clique no botão "+ Transação"
2. Selecione o tipo: Receita
3. Preencha: valor, descrição, fonte de renda, conta, data
4. Clique em Salvar

### Como registrar uma transferência entre contas:
1. Clique no botão "+ Transação"
2. Selecione o tipo: Transferência
3. Escolha conta de origem e destino, e o valor
4. Clique em Salvar

### Filtros disponíveis:
- Por período (mês/ano)
- Por tipo (despesa, receita, transferência)
- Por categoria
- Por conta
- Por status (efetivada, pendente)
- Busca por texto na descrição

### Transações agendadas:
- Receitas e despesas recorrentes geram transações pendentes automaticamente
- No widget de "Transações Agendadas", clique em "Confirmar" para efetivar
- Use "Iniciar Mês" para gerar todas as transações recorrentes do mês

### Ações em transações:
- Editar: clique na transação para abrir o formulário de edição
- Excluir: clique no ícone de lixeira
- As transações pendentes podem ser marcadas como efetivadas
- Para transações recorrentes, é possível aplicar alterações a toda a série

### Atalho rápido:
- Use Ctrl+N (ou Cmd+N no Mac) para abrir o formulário de nova transação de qualquer página
- O botão "+" na sidebar também abre o formulário rápido

### Via chat ou WhatsApp/Telegram:
Você pode registrar gastos e receitas por mensagem. Exemplos:
- "gastei 50 no mercado"
- "recebi 5000 de salário"
- "paguei 200 de luz no cartão nubank"
- "comprei 1000 em 3x no cartão"

---

## 4. METAS (/app/goals)

Metas de economia para objetivos específicos (viagem, reserva de emergência, etc.).

### Como criar uma meta:
1. Clique em "+ Meta"
2. Preencha: nome, valor alvo, prazo (opcional), ícone
3. Clique em Salvar

### Como contribuir para uma meta:
1. Clique no botão "Contribuir" na meta desejada
2. Informe o valor da contribuição
3. Escolha de qual conta sairá o valor
4. Clique em Confirmar

### Acompanhamento:
- Barra de progresso mostra porcentagem atingida
- Valor atual vs valor alvo
- Quando a meta é atingida, uma celebração é exibida

### Arquivar meta:
- Metas concluídas ou que não deseja mais acompanhar podem ser arquivadas
- Metas arquivadas ficam em uma seção separada

---

## 5. CONTAS (/app/accounts)

Gerencia contas bancárias, cartões de crédito, carteiras, etc.

### Tipos de conta:
- Conta corrente (checking)
- Poupança (savings)
- Cartão de crédito (credit_card) - tem dia de fechamento e limite
- Dinheiro/Carteira (cash)
- Investimento (investment)
- Benefício/VR/VA (benefit)

### Como criar uma conta:
1. Clique em "+ Conta"
2. Preencha: nome, tipo, saldo inicial
3. Para cartão de crédito: informe o limite e o dia de fechamento
4. Clique em Salvar

### Informações exibidas:
- Cards de resumo: Patrimônio líquido, Saldo em contas, Fatura de cartões
- Saldo atual de cada conta
- Para cartões de crédito: limite, saldo utilizado, disponível, dia de fechamento e vencimento
- Total consolidado de todas as contas
- Filtro para incluir/excluir investimentos no cálculo do patrimônio
- Para planos Duo: filtro por "Minhas contas" ou "Compartilhadas"

---

## 6. CATEGORIAS (/app/categories)

Página dedicada para gerenciar categorias e grupos de categorias.

### Funcionalidades:
- Resumo: quantidade de grupos e categorias
- Assistente de categorias: cria categorias automaticamente baseado em templates
- Organização por grupos expansíveis (ex: Moradia, Alimentação, Transporte, Lazer)
- Cada categoria mostra: ícone, nome e tipo de comportamento (Acumulativa ou Recorrente)
- Ações: criar, editar, excluir categoria; criar novo grupo

---

## 7. FONTES DE RENDA (/app/income)

Página dedicada para gerenciar fontes de receita.

### Funcionalidades:
- Resumo: total da renda mensal e quantidade de fontes
- Fontes organizadas por tipo: Salário, Benefícios, Freelance, Aluguel, Investimento, Outro
- Cada fonte mostra: nome, frequência, dia do mês, membro responsável (Duo), valor
- Ações: criar, editar, excluir fonte de renda

---

## 8. RELATÓRIOS / INSIGHTS (/app/insights)

Análises e gráficos detalhados das finanças.

### Relatórios disponíveis:
- Cards de resumo: Orçado vs Real para receitas e despesas
- Indicador de saúde do orçamento
- Projeção de gastos (se a tendência continuar)
- Top categorias de gastos e categorias estouradas
- Comparativo com o mês anterior (variação de receita, despesas e saldo)
- Gráficos: tendência diária, distribuição mensal, breakdown por categoria

---

## 9. CONFIGURAÇÕES (/app/settings)

### Perfil:
- Alterar nome e foto de perfil

### Aparência:
- Tema claro/escuro/sistema

### Membros (plano Duo):
- Convidar parceiro(a) para compartilhar o orçamento
- Gerenciar membros do orçamento
- O convite é feito por e-mail ou link

### Privacidade (plano Duo):
- Modo Visível: ambos veem todas as categorias e transações
- Modo Privado: cada membro só vê suas próprias categorias pessoais
- Modo Unificado: tudo é compartilhado, sem separação por membro

### Conexão WhatsApp/Telegram:
- Conecte seu WhatsApp ou Telegram para registrar transações por mensagem
- Na seção de configurações, clique em "Conectar WhatsApp" ou "Conectar Telegram"
- Escaneie o QR code ou envie o código de verificação
- Após conectado, envie mensagens como "gastei 50 no mercado" para registrar gastos

### Plano:
- Visualizar plano atual (Solo ou Duo)
- Gerenciar assinatura

### Privacidade de Dados:
- Opção para exportar seus dados
- Opção para excluir sua conta permanentemente

### Suporte:
- Links para ajuda e contato
- Refazer tutorial de configuração

---

## 10. PLANOS

### Solo:
- Para uso individual
- Todas as funcionalidades de gestão financeira
- Conexão com WhatsApp/Telegram

### Duo:
- Para casais/parceiros
- Tudo do Solo + compartilhamento de orçamento
- Convite de parceiro(a)
- Modos de privacidade
- Visão individual e compartilhada
- Seletor de visualização: Pessoal, Compartilhado ou Tudo

---

## 11. MODO DE VISUALIZAÇÃO (Plano Duo)

No plano Duo, um seletor na sidebar permite alternar entre:
- Pessoal: vê apenas suas transações e categorias
- Compartilhado: vê itens compartilhados do casal
- Tudo: vê tudo (pessoal + compartilhado)

---

## 12. SETUP INICIAL (/app/setup)

Ao criar a conta, o assistente de configuração guia o usuário:
1. Escolher o plano (Solo ou Duo)
2. Configurar contas bancárias
3. Definir fontes de renda
4. Criar categorias de despesas
5. Definir metas (opcional)

---

## 13. CONTAS RECORRENTES

Dentro da página de Planejamento, é possível configurar contas recorrentes em cada categoria.

### Como funciona:
- Contas recorrentes (luz, aluguel, internet, etc.) são vinculadas a uma categoria
- Cada conta tem: nome, valor, frequência (semanal, mensal, anual), dia de vencimento, conta vinculada
- O sistema gera transações pendentes automaticamente com base nas contas recorrentes
- Marcadores indicam se é débito automático ou valor variável
- No início de cada mês, use "Iniciar Mês" na página de Transações para gerar todas as pendências

---

## 14. WHATSAPP / TELEGRAM

### Comandos disponíveis:
- /ajuda ou /help - Ver comandos disponíveis
- /saldo ou /balance - Ver resumo do mês
- /cancelar ou /cancel - Cancelar operação em andamento
- /desfazer ou /undo - Desfazer última transação

### Registrar gasto por mensagem:
- "gastei 50 no mercado" - registra gasto de R$ 50
- "paguei 200 de luz" - registra gasto de R$ 200 na categoria Energia
- "comprei 1000 em 3x no cartão" - registra compra parcelada
- "gastei 30 no uber ontem" - registra com data de ontem

### Registrar receita por mensagem:
- "recebi 5000 de salário" - registra receita
- "chegou o VR" - registra receita do vale refeição

### Consultas por mensagem:
- "quanto gastei esse mês?" - resumo do mês
- "quanto sobrou em alimentação?" - saldo da categoria
- "como está minha meta de viagem?" - progresso da meta
- "qual o saldo do nubank?" - saldo da conta

---

## 15. ATALHOS E DICAS

- Ctrl+N (ou Cmd+N no Mac): abre o formulário de nova transação de qualquer página
- O botão "+" na sidebar permite adicionar transações rapidamente
- Use o chat do assistente (canto inferior direito) para tirar dúvidas, registrar gastos ou consultar saldos
- Para reportar bugs ou sugerir melhorias, use o assistente no canto inferior direito
- Transações podem ser editadas clicando nelas na lista
- O período pode ser alterado no topo das páginas para ver dados de outros meses
- No plano Duo, use o seletor de visualização na sidebar para alternar entre dados pessoais e compartilhados

---

## PERGUNTAS FREQUENTES

P: Como mudo minha senha?
R: O HiveBudget usa login por e-mail (magic link) ou Google. Não há senha para alterar.

P: Como cancelo minha assinatura?
R: Vá em Configurações > Plano e clique em gerenciar assinatura.

P: Como convido meu parceiro(a)?
R: Vá em Configurações > Membros e envie um convite por e-mail ou link. Necessário plano Duo.

P: Posso usar em mais de um dispositivo?
R: Sim, basta fazer login com a mesma conta.

P: Como excluo minha conta?
R: Vá em Configurações > Privacidade de Dados.

P: Como conecto o WhatsApp?
R: Vá em Configurações, na seção de conexões, clique em "Conectar WhatsApp" e siga as instruções.

P: Posso registrar gastos por voz?
R: Sim, pelo WhatsApp ou Telegram. Envie um áudio descrevendo o gasto e a IA transcreve automaticamente.

P: Como funciona o parcelamento?
R: Ao registrar um gasto, marque como parcelado e informe o número de parcelas. O sistema cria automaticamente as parcelas futuras considerando o dia de fechamento do cartão.

P: Como vejo gastos de um mês específico?
R: Use o seletor de período no topo da página (disponível no Dashboard, Transações e Planejamento).
`;
