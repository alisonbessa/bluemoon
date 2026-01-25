# Setup do Sistema de Cadastro e Assinaturas

Este documento descreve as configurações manuais necessárias para ativar o sistema de planos e assinaturas do HiveBudget.

---

## 1. Stripe Dashboard

### 1.1 Criar Produtos e Preços (Opção A: Automático via App)

A forma mais fácil é usar a funcionalidade de sincronização automática:

1. Acesse `/super-admin/plans`
2. Crie ou edite um plano (ex: Solo, Duo)
3. Configure os preços em centavos (ex: 1490 para R$ 14,90)
4. Marque os tipos de preço ativos (Mensal, Anual)
5. Clique no botão **"Sync to Stripe"**
6. O sistema irá:
   - Criar o produto automaticamente no Stripe
   - Criar os preços com trial de 30 dias
   - Atualizar os Price IDs no banco de dados

### 1.1 Criar Produtos e Preços (Opção B: Manual no Dashboard)

Acesse: https://dashboard.stripe.com/products

**Produto "Solo":**
- Nome: `Solo`
- Descrição: `Plano individual para gerenciar suas finanças`
- Preços:
  - **Mensal**: R$ 14,90/mês (1490 centavos), recurring monthly
  - **Anual**: R$ 139,90/ano (13990 centavos), recurring yearly

**Produto "Duo":**
- Nome: `Duo`
- Descrição: `Plano compartilhado para casais ou parceiros`
- Preços:
  - **Mensal**: R$ 19,90/mês (1990 centavos), recurring monthly
  - **Anual**: R$ 189,90/ano (18990 centavos), recurring yearly

### 1.2 Configurar Trial Period

**Se usou a Opção A (Automático):** O trial de 30 dias já é configurado automaticamente.

**Se usou a Opção B (Manual):** Em cada preço criado:
1. Clique no preço para editar
2. Em "Free trial", defina 30 dias
3. Salvar

### 1.3 Configurar Webhooks

Acesse: https://dashboard.stripe.com/webhooks

Adicione ou verifique o endpoint:
- **URL**: `https://seu-dominio.com/api/webhooks/stripe`
- **Eventos necessários**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end` ← **NOVO**
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

---

## 2. Variáveis de Ambiente

Adicione ao `.env.local`:

```bash
# Stripe Price IDs (obter do dashboard após criar os produtos)
# Copie os price_id de cada preço criado no passo 1.1
STRIPE_PRICE_SOLO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_SOLO_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_DUO_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_DUO_YEARLY=price_xxxxxxxxxxxxx

# Trial Duration (em dias) - opcional, padrão é 30
STRIPE_TRIAL_DAYS=30
```

---

## 3. Banco de Dados

### 3.1 Executar Migration

```bash
npx drizzle-kit push
```

### 3.2 Atualizar Tabela Plans

**Se usou a sincronização automática:** Os price IDs já foram salvos automaticamente no banco.

**Se criou os preços manualmente no Stripe:**

**Opção A: Via Super Admin (Recomendado)**
1. Acesse `/super-admin/plans`
2. Edite o plano Solo e adicione os price IDs
3. Edite o plano Duo e adicione os price IDs
4. Configure as quotas:
   - Solo: `maxBudgetMembers: 1`
   - Duo: `maxBudgetMembers: 2`

**Opção B: Via SQL**
```sql
-- Solo Mensal
UPDATE plans
SET "monthlyStripePriceId" = 'price_xxx'
WHERE codename = 'solo';

-- Solo Anual
UPDATE plans
SET "yearlyStripePriceId" = 'price_xxx'
WHERE codename = 'solo';

-- Duo Mensal
UPDATE plans
SET "monthlyStripePriceId" = 'price_xxx'
WHERE codename = 'duo';

-- Duo Anual
UPDATE plans
SET "yearlyStripePriceId" = 'price_xxx'
WHERE codename = 'duo';
```

---

## 4. Inngest

Os jobs de lembrete de trial e convite serão registrados automaticamente.

Verifique que as variáveis estão configuradas:

```bash
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx
```

Para testar localmente:
```bash
npm run dev  # Já inclui inngest-cli dev
```

Acesse http://localhost:8288 para ver os jobs registrados:
- `send-trial-reminders` - Diário às 10:00 (Brasília)
- `send-invite-reminders` - A cada 6 horas

---

## 5. Resend (Emails)

Verifique que as variáveis estão configuradas:

```bash
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=noreply@seudominio.com
```

Os templates de email criados:
- `TrialReminder7Days.tsx` - Lembrete 7 dias antes
- `TrialReminder2Days.tsx` - Lembrete 2 dias antes
- `InviteReminder.tsx` - Lembrete de convite pendente

---

## 6. Verificação Final

### Checklist de Testes

- [ ] Novo usuário → Choose Plan → Checkout Stripe com trial de 30 dias
- [ ] Trial ativo → Ver dias restantes em Settings
- [ ] Cancelar trial → Confirmar que não haverá cobrança
- [ ] Link de acesso lifetime → Escolher Solo/Duo → Conta criada
- [ ] Super admin pode criar/expirar links em `/super-admin/access-links`
- [ ] Alterar role de usuário em `/super-admin/users/[id]`
- [ ] Build passa sem erros: `npm run build`

### URLs Importantes

| Página | URL |
|--------|-----|
| Escolher Plano | `/app/choose-plan` |
| Configurações (ver plano) | `/app/settings` |
| Resgatar Link | `/redeem/[code]` |
| Admin - Links de Acesso | `/super-admin/access-links` |
| Admin - Usuários | `/super-admin/users` |
| Admin - Planos | `/super-admin/plans` |

---

## 7. Estrutura de Roles

| Role | Descrição | Pagamento |
|------|-----------|-----------|
| `user` | Usuário padrão | Requer assinatura Stripe |
| `beta` | Acesso beta gratuito | Sem cobrança |
| `lifetime` | Acesso vitalício | Sem cobrança futura |
| `admin` | Administrador | Acesso total |

---

## 8. Fluxo de Usuário

```
Novo Usuário
    ↓
Onboarding (cria budget)
    ↓
Choose Plan (/app/choose-plan)
    ↓
Stripe Checkout (com 30 dias trial)
    ↓
Trial Ativo
    ↓
[D-7] Email: "Seu trial termina em 7 dias"
    ↓
[D-2] Email: "Faltam 2 dias para o trial"
    ↓
Trial termina → Cobrança automática ou cancelamento
```

---

## 9. Suporte

Dúvidas sobre a implementação? Verifique:
- Commits na branch `feature/cadastro`
- Plano completo em `.claude/plans/majestic-wibbling-dove.md`
