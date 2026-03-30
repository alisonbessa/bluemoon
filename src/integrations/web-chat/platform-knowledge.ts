/**
 * Platform knowledge base for the AI chatbot.
 * Contains instructions about all HiveBudget features so the AI can answer user questions.
 * Source of truth: .project/content/guia-completo-plataforma.md
 */

export const PLATFORM_KNOWLEDGE = `
# HiveBudget — Guia Completo da Plataforma

O HiveBudget é um app de planejamento financeiro pessoal focado em casais e pessoas solo. Permite planejar renda, alocar despesas por categoria, acompanhar metas de poupança, controlar contas e registrar transações. Tudo em reais (BRL).

Planos disponíveis:
- Solo — para uso individual
- Duo — para casais ou duas pessoas compartilhando finanças

---

## NAVEGAÇÃO PRINCIPAL

O menu lateral (sidebar) tem as seguintes páginas:
- Dashboard (página inicial com resumo do mês)
- Planejamento (distribui a renda em categorias e metas)
- Transações (registra e acompanha movimentações)
- Renda (gerencia fontes de renda)
- Categorias (cria e organiza categorias de gastos)
- Contas (controla saldos bancários e cartões)
- Metas (objetivos de poupança com prazo)
- Insights (análises e comparativos de gastos)
- Configurações (perfil, membros, privacidade, plano)

---

## O QUE O CHAT PODE E NÃO PODE FAZER

O chat do assistente consegue:
- Registrar gastos: "gastei 50 no mercado", "paguei 120 de internet"
- Registrar receitas: "recebi 5000 de salário"
- Consultar saldo: "quanto gastei esse mês?", "qual meu saldo?"
- Consultar categorias: "quanto sobrou em alimentação?"
- Consultar metas: "como está minha meta?"
- Responder dúvidas sobre a plataforma

O chat NÃO consegue (precisa usar o app):
- Criar metas, categorias, contas ou fontes de renda
- Editar ou excluir itens existentes
- Fazer alocações no planejamento
- Alterar configurações

---

## GUIA DE NAVEGAÇÃO — COMO FAZER CADA AÇÃO

### Como criar uma meta
1. No menu lateral, clique em "Metas"
2. Clique no botão "+" ou "Nova meta"
3. Preencha: nome, ícone, valor alvo, data alvo, conta destino
4. Opcionalmente: conta de origem (para confirmar contribuições mensais)
5. Clique em "Criar"

Também é possível criar uma meta pelo Planejamento: role até a seção Metas e clique no ícone de "+".

### Como criar uma categoria
1. No menu lateral, clique em "Categorias"
2. Clique no botão "+" ou "Nova categoria"
3. Escolha o grupo (Essencial, Estilo de vida, Prazeres, Reservas, Sonhos)
4. Defina nome, ícone e comportamento (refill up ou set aside)
5. Clique em "Criar"

### Como criar uma conta
1. No menu lateral, clique em "Contas"
2. Clique em "Nova conta"
3. Escolha o tipo (Corrente, Poupança, Cartão de crédito, etc.)
4. Preencha nome, saldo inicial e demais campos
5. Clique em "Criar"

### Como adicionar uma fonte de renda
1. No menu lateral, clique em "Renda"
2. Clique em "Nova fonte de renda"
3. Escolha tipo (Salário, Freelance, etc.) e frequência
4. Defina o valor e a data de início
5. Clique em "Adicionar"

### Como registrar uma transação pelo app
1. No menu lateral, clique em "Transações"
2. Clique no botão "+" ou "Nova transação"
3. Escolha o tipo (Despesa, Receita, Transferência)
4. Preencha valor, conta, categoria e data
5. Clique em "Salvar"

Ou use o chat diretamente: "gastei 50 no mercado"

### Como criar uma despesa fixa (recorrente) pela página de Transações
1. No menu lateral, clique em "Transações"
2. Clique em "Nova transação"
3. Escolha tipo "Despesa"
4. Preencha valor, conta e categoria
5. Na descrição, coloque o nome da despesa (ex: "Aluguel")
6. Ative o toggle "Despesa fixa"
7. Escolha a frequência (Mensal, Semanal ou Anual) e o dia de vencimento
8. Clique em "Criar"

A despesa fixa aparecerá automaticamente no Planejamento dos meses seguintes como transação pendente.

Também é possível criar despesas fixas pelo Planejamento: no menu de 3 pontos da categoria, clique em "Adicionar despesa fixa".

### Como alocar no planejamento
1. No menu lateral, clique em "Planejamento"
2. Na seção Despesas, clique na categoria desejada
3. Digite o valor a alocar naquele mês
4. Confirme

### Como confirmar a contribuição de uma meta
1. No menu lateral, clique em "Planejamento"
2. Role até a seção "Metas"
3. Clique em "Confirmar" ao lado da meta desejada
   (o botão só aparece se a meta tiver conta de origem configurada)

### Como convidar o parceiro (Duo)
1. Vá em Configurações
2. Clique em "Membros"
3. Clique em "Convidar parceiro"
4. Digite o email do parceiro

---

## DASHBOARD (/app)

A página inicial mostra um resumo do mês atual:
- Renda planejada vs recebida — quanto se esperava receber e quanto já entrou
- Despesas planejadas vs gastas — quanto foi alocado nas categorias e quanto já foi gasto
- Disponível — o que sobra: renda menos tudo que foi alocado (incluindo metas)
- Comprometimentos do mês — lista de despesas fixas e parcelas pendentes de confirmação
- Progresso das metas — quanto já foi guardado em cada meta
- Gráfico diário — evolução do saldo ao longo dos dias do mês
- Gráfico mensal — comparativo de renda e despesa entre meses
- Cartões de crédito — gasto atual vs limite disponível
- Lista de tarefas de onboarding — guia de primeiros passos para novos usuários

Plano Duo:
- Mostra balanço de despesas compartilhadas entre os dois membros
- Permite "acertar" o balanço com um clique (cria uma transação de transferência)

---

## PLANEJAMENTO (Budget)

O Planejamento é onde se distribui a renda entre categorias e metas antes do mês começar — ou ao longo dele.

A renda planejada total é mostrada no topo. O usuário aloca valores para cada categoria. O indicador "Para Alocar" mostra quanto da renda ainda não foi distribuído — incluindo as metas mensais.

### Seções do Planejamento

O Planejamento tem três seções, cada uma em um acordeão expansível:

#### 1. Renda
Lista todas as fontes de renda do mês. Para cada fonte mostra:
- Valor planejado para o mês
- Valor já recebido (transações confirmadas)
- Diferença (a receber)

Ações por fonte de renda:
- Editar valor planejado — ajusta só aquele mês sem alterar a configuração permanente
- Ignorar neste mês — zera o valor planejado só para o mês atual (ex: férias sem salário)
- Restaurar — volta ao valor padrão após ter ignorado
- Editar fonte — abre o diálogo de escopo

#### 2. Despesas
Lista os grupos de categoria com suas categorias. Para cada categoria mostra:
- Valor alocado no mês
- Valor já gasto
- Valor disponível

Clicar na categoria abre o modal de alocação. É possível criar novas categorias diretamente pelo planejamento.

#### 3. Metas
Lista as metas ativas com o valor mensal sugerido (calculado automaticamente com base no prazo). Para cada meta mostra:
- Progresso (%) e barra visual
- Valor mensal necessário
- Botão Confirmar — quando a meta tem conta de origem configurada, confirmar cria a transferência automática entre contas e atualiza o progresso da meta

### Navegação por mês
O seletor de mês no topo permite navegar para meses anteriores e futuros.

### Indicador "Para Alocar"
- Cinza — ainda há renda para distribuir
- Verde — tudo alocado (zero sobra)
- Vermelho — excedido (alocou mais do que a renda)

---

## FONTES DE RENDA

As fontes de renda definem quanto se espera receber regularmente.

### Tipos de renda
- Salário — renda de emprego formal
- Benefício — vale refeição, transporte, etc.
- Freelance — trabalho avulso
- Aluguel — renda de imóveis
- Investimento — rendimentos, dividendos
- Outros — qualquer outra fonte

### Frequências
- Mensal — aparece todo mês no dia configurado
- Quinzenal — dois pagamentos por mês (2x o valor)
- Semanal — quatro pagamentos por mês (4x o valor)
- Anual — aparece apenas no mês configurado (ex: 13º em dezembro)
- Pontual — aparece uma única vez no mês+ano configurado

### Data de início
Toda fonte de renda tem data de início (mês e ano). Ela não aparece em meses anteriores à data de início — evita que uma nova fonte apareça retroativamente.

### Contribuição ao orçamento (Duo)
Em plano Duo, é possível definir quanto da renda vai para o orçamento compartilhado e quanto fica como reserva pessoal. Ex: salário de R$5.000, contribuição de R$3.000 ao casal, R$2.000 como reserva pessoal.

### Conta de destino
Opcionalmente, cada fonte de renda pode ser vinculada à conta bancária onde cai o dinheiro.

### Confirmação automática
Com essa opção ativa, a transação de renda é confirmada automaticamente no dia do mês configurado.

### Edição com escopo (estilo Google Calendar)
Ao editar uma fonte de renda pelo Planejamento, aparece um diálogo de escopo:
- Apenas este mês — altera só o valor planejado do mês atual (não muda a fonte permanente)
- Este e os próximos — encerra a fonte atual e cria uma nova igual, com as alterações, a partir do mês atual
- Todos os meses — edita diretamente a fonte permanente

### Ignorar um mês
O ícone de lixeira no Planejamento não exclui a fonte — apenas "ignora" ela naquele mês (define o planejado como zero). Um botão de restaurar aparece para desfazer.

---

## CATEGORIAS

As categorias organizam as despesas em 5 grupos fixos:
- Essencial (essential) — gastos fixos obrigatórios: moradia, contas, alimentação, transporte, saúde, educação
- Estilo de vida (lifestyle) — gastos variáveis de qualidade de vida: restaurantes, roupas, streaming, academia
- Prazeres (pleasures) — gastos pessoais de cada membro (independente, privado se quiser)
- Reservas (investments) — poupança e investimentos: fundo de emergência, previdência, reservas
- Sonhos (goals) — objetivos com prazo: viagem, carro, casa, casamento

### Comportamento das categorias
- Refill up (completar) — a cada mês, o valor volta ao planejado do zero. Ideal para gastos contínuos como alimentação.
- Set aside (separar) — o valor não gasto carrega para o mês seguinte. Ideal para poupanças e reservas.

### Categorias pessoais (Duo)
No grupo Prazeres, cada membro pode ter suas próprias categorias, visíveis só para ele (dependendo das configurações de privacidade).

### Alocação mensal
No Planejamento, clicar numa categoria abre um modal para:
- Definir o valor alocado naquele mês
- Ver o histórico de alocação
- Configurar recorrência da alocação

---

## CONTAS

As contas representam onde o dinheiro está (banco, cartão, caixa, investimento).

### Tipos de conta
- Corrente — conta bancária principal
- Poupança — conta de poupança
- Cartão de crédito — com limite, fechamento e vencimento
- Dinheiro — dinheiro físico em carteira
- Investimento — conta de corretora ou fundo
- Benefício — vale refeição, transporte, etc.

### Campos especiais

Cartão de crédito:
- Limite de crédito
- Dia de fechamento da fatura (ex: dia 10)
- Dia de vencimento (ex: dia 25)
- Conta de pagamento vinculada (de onde sai o dinheiro para pagar a fatura)

Benefício:
- Valor do depósito mensal
- Dia do depósito

### Saldo
O saldo de cada conta é atualizado a cada transação confirmada. Exibe tanto o saldo total quanto o saldo confirmado (somente transações cleared/reconciled).

---

## TRANSAÇÕES

As transações são o coração do sistema — registram toda movimentação financeira.

### Tipos
- Despesa — saída de dinheiro, vinculada a uma categoria
- Renda — entrada de dinheiro, vinculada a uma fonte de renda
- Transferência — movimentação entre contas próprias (não altera balanço total)

### Status
- Pendente — agendada, ainda não ocorreu
- Confirmada (cleared) — realizada e contabilizada no saldo
- Reconciliada — verificada com extrato bancário

### Parcelamento
Compras parceladas são registradas com número de parcelas. O sistema cria automaticamente todas as parcelas, cada uma como uma transação separada com o mesmo valor. Ex: R$1.200 em 12x = 12 transações de R$100.

### Recorrência
Transações recorrentes se repetem automaticamente (semanal, mensal ou anual), com ou sem data de término. Geradas como "pendentes" para confirmação manual.

### Despesas fixas (recurring bills)
O sistema gera automaticamente transações pendentes para despesas fixas configuradas (aluguel, internet, plano de saúde etc.) no dia de vencimento. O usuário confirma com um clique.

### Escopo de transação (Duo)
Cada transação pode ser:
- Compartilhada — visível para ambos os membros
- Pessoal de [membro] — visível conforme a privacidade configurada

### Quem pagou (Duo)
O campo "Pago por" registra qual membro efetuou o pagamento de uma despesa compartilhada. Isso alimenta o cálculo de balanço no Dashboard.

---

## METAS

As metas são objetivos de poupança com valor e prazo definidos.

### Campos de uma meta
- Nome e ícone — identificação visual
- Valor alvo — total a ser guardado
- Data alvo — prazo para atingir
- Conta destino — onde o dinheiro fica guardado (poupança, investimento ou corrente)
- Conta origem — de onde sai o dinheiro nas contribuições mensais
- Valor já guardado — valor inicial ao criar (para metas já em andamento)

### Contribuição mensal
O app calcula automaticamente quanto poupar por mês: (valor restante ÷ meses até o prazo). Esse valor aparece no Planejamento como compromisso mensal.

### Confirmar contribuição
Se a meta tem conta de origem configurada, um botão Confirmar aparece no Planejamento. Ao clicar:
1. Uma transferência é criada da conta origem para a conta destino
2. O progresso da meta é atualizado
3. A meta aparece como "Confirmada" no mês

### Metas conjuntas (Duo)
Em plano Duo, metas conjuntas permitem que cada membro configure:
- Sua conta de origem (conta de cada um)
- Seu valor mensal de contribuição (pode ser diferente entre os membros)

Cada membro confirma sua parte separadamente. Ex: um contribui R$300 da conta corrente dele, o outro contribui R$200 da conta poupança dela.

### Estados de uma meta
- Ativa — em andamento
- Concluída — atingiu o valor alvo
- Arquivada — desativada (oculta mas não excluída)

---

## INSIGHTS

A página de Insights traz análises do comportamento financeiro:
- Top categorias — onde mais se gastou no período
- Comparativo entre meses — evolução de renda e despesa
- Tendências de gasto — padrões ao longo do tempo

---

## FUNCIONALIDADES DUO (CASAL)

O plano Duo permite que duas pessoas compartilhem o mesmo orçamento.

### Membros
- Dono (owner) — criou o orçamento, acesso total
- Parceiro (partner) — convidado por email, acesso completo

### Privacidade

Há três modos de privacidade para o orçamento:
- Visível — todas as transações, incluindo pessoais, são vistas pelo parceiro
- Unificado — só os totais; detalhes pessoais ficam ocultos
- Privado — nada das transações pessoais do outro é visível

Cada membro também pode ter seu próprio nível de privacidade individualmente.

### Separação de renda
Cada membro tem sua própria renda e pode definir quanto contribui para o orçamento compartilhado vs quanto fica como reserva pessoal.

### Visões do Planejamento (Duo)
No modo Duo, o Planejamento pode ser visualizado em três seções:
- Planejamento Compartilhado — categorias do casal + renda com contribuição
- Meu Planejamento — categorias pessoais + reserva pessoal
- Planejamento de [nome do parceiro] — visão do parceiro (se privacidade permitir)

### Balanço de despesas compartilhadas
O Dashboard Duo mostra quanto cada membro pagou de despesas compartilhadas no mês e quem está "devendo" quem. Um botão "Acertar" cria uma transferência para equalizar.

### Prazeres pessoais
Cada membro pode ter um limite mensal de "Prazeres" — gastos pessoais no grupo Prazeres. O app avisa quando o limite está próximo.

---

## CONFIGURAÇÕES

- Perfil — nome e foto de perfil
- Aparência — tema claro ou escuro
- Plano — visualização do plano atual (Solo ou Duo), upgrade ou gerenciamento de assinatura
- Membros (Duo) — convidar parceiro por email, ver membros ativos, gerenciar permissões
- Privacidade (Duo) — alterar modo de privacidade do orçamento, configurar privacidade individual
- Dados e Privacidade — exportar todos os dados (LGPD), solicitar exclusão da conta
- Suporte — acessar o tutorial interativo, enviar feedback, reportar problemas

---

## ONBOARDING (PRIMEIROS PASSOS)

Ao criar uma conta e escolher um plano, o app guia o usuário por um wizard de configuração:

Plano Solo:
1. Informações financeiras (renda e contas)
2. Configuração do orçamento (alocação inicial por categoria)

Plano Duo:
1. Configuração de privacidade
2. Informações financeiras
3. Configuração do orçamento
4. Resumo e início rápido

O wizard usa templates com sugestões de alocação baseadas na renda informada.

A lista de tarefas no Dashboard guia os primeiros passos após o onboarding:
- Criar primeira fonte de renda
- Criar primeira categoria
- Fazer primeira alocação
- Registrar primeira transação
- Criar primeira meta

---

## CONCEITOS IMPORTANTES

### Tudo em centavos
Todos os valores são armazenados em centavos (inteiros) para evitar erros de arredondamento. Ex: R$100,00 = 10000.

### Saldo vs Saldo Confirmado
O saldo de uma conta tem dois valores:
- Saldo total — inclui transações pendentes
- Saldo confirmado — apenas transações cleared/reconciled

### Para Alocar
O indicador "Para Alocar" no Planejamento = Renda planejada − Despesas alocadas − Metas mensais. É zero quando a renda foi completamente distribuída.

### Carry-over (Carrego)
Categorias com comportamento "set aside" carregam o saldo não gasto para o próximo mês. Ex: guardou R$500 para viagem em janeiro mas não usou → em fevereiro começa com R$500 + a nova alocação.

### Ciclo de fatura (cartão de crédito)
O ciclo de uma fatura começa um dia após o fechamento do mês anterior. Ex: fechamento dia 10 → ciclo de 11 a 10 do próximo mês. Compras após o fechamento entram na próxima fatura.

---

## INTEGRAÇÕES

### Telegram
O app tem integração com Telegram via bot. É possível registrar transações enviando mensagens de texto para o bot, que usa IA (Gemini) para interpretar e categorizar automaticamente.

### Chat do app (Assistente)
O assistente flutuante no app permite:
- Registrar gastos: "gastei 50 no mercado"
- Registrar receitas: "recebi 5000 de salário"
- Consultar saldo: "quanto gastei esse mês?"
- Consultar categoria: "quanto sobrou em alimentação?"
- Consultar metas: "como está minha meta?"
- Tirar dúvidas sobre a plataforma
- Reportar bugs
- Sugerir melhorias

---

## PERGUNTAS FREQUENTES

### Como funciona a confirmação de renda?
Ao registrar uma transação de renda (ou ao auto-confirmar), ela muda de "pendente" para "confirmada". O valor confirmado aparece na coluna "Recebido" do Planejamento.

### Por que minha fonte de renda não aparece em meses anteriores?
Fontes de renda têm uma data de início. Elas só aparecem a partir do mês/ano configurado.

### Como fazer para uma renda aparecer só em um mês do ano?
Use a frequência Pontual e configure o mês e ano específico.

### Como fazer para o 13º salário aparecer só em dezembro?
Use a frequência Anual e configure o mês como dezembro.

### O que acontece quando eu ignoro uma fonte de renda no mês?
O valor planejado daquele mês vai para zero. A fonte de renda continua ativa e voltará normalmente no próximo mês. É possível restaurar o valor padrão pelo botão de restaurar.

### Posso editar um salário só para os meses futuros?
Sim. Ao clicar em editar no Planejamento e escolher "Este e os próximos", o app encerra a fonte atual e cria uma nova com os novos dados a partir do mês atual.

### Como funciona o carry-over de categorias?
Categorias com comportamento "set aside" acumulam. Se alocou R$200 para emergência e gastou R$0, no próximo mês terá R$200 de carry-over mais a nova alocação.

### O que é contribuição ao orçamento?
Em plano Duo, é o valor que vai para o orçamento compartilhado. Ex: um salário de R$5.000 com contribuição de R$3.500 → R$3.500 entram nas despesas do casal, R$1.500 ficam como reserva pessoal.

### Como funciona a meta conjunta no Duo?
Uma meta conjunta tem conta de destino única (onde o dinheiro fica). Cada membro configura sua conta de origem e valor mensal. Cada um confirma sua parte no mês. O progresso é acumulado das duas contribuições.

### O botão "Confirmar" na meta não aparece. Por quê?
O botão só aparece se a meta tiver uma conta de origem configurada. Para metas pessoais, configure no campo "Conta origem". Para metas conjuntas Duo, cada membro precisa ter sua conta de origem definida nas configurações da meta.

### O que são as despesas fixas (recurring bills)?
São cobranças que se repetem todo mês automaticamente — aluguel, internet, plano de saúde, etc. O app gera uma transação pendente no dia de vencimento para o usuário confirmar com um clique.

### Como funciona o parcelamento?
Ao criar uma despesa parcelada (ex: geladeira em 12x), o app cria 12 transações pendentes automaticamente, uma para cada mês. Cada parcela é confirmada individualmente no seu mês.

### Como funciona o balanço compartilhado do Duo?
O app soma tudo que cada membro pagou de despesas compartilhadas no mês. Se um pagou mais que o outro, o Dashboard mostra quem está devendo. O botão "Acertar" registra uma transferência para equilibrar.

### Posso usar o app com privacidade total do parceiro?
Sim. No modo Privado, as transações pessoais de cada membro ficam completamente ocultas. Só os valores alocados nas categorias compartilhadas são visíveis.

### Como exportar meus dados?
Em Configurações > Dados e Privacidade > Exportar dados. O app gera um arquivo com todas as transações, contas, categorias e metas.
`;
