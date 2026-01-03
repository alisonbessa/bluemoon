# Configuração de Ambientes: Dev vs Produção

## Criptografia de Banco de Dados

### Encryption at Rest (Criptografia em repouso)
- **Neon**: Já vem criptografado por padrão em todos os planos (incluindo gratuito)
- Dados no disco são criptografados automaticamente
- Acesso via SQL funciona normalmente

### Encryption in Transit (SSL/TLS)
- Já ativo com `?sslmode=require` na connection string

### Column-level Encryption (Criptografia de colunas)
- Pode ser adicionado depois para dados sensíveis (CPF, dados bancários)
- Dev pode não ter, Prod pode ter - sem problemas
- Exigiria migração de dados existentes

---

## Checklist de Configuração

### Fase 1: Infraestrutura de Banco (Neon)

- [ ] Criar projeto Neon para produção: `hivebudget-prod`
  - Região: `sa-east-1` (São Paulo)
  - Guardar DATABASE_URL
- [ ] Renomear banco atual para `hivebudget-dev`

### Fase 2: Hosting (Vercel)

- [ ] Configurar variáveis de ambiente separadas por ambiente

| Variável | Dev | Prod |
|----------|-----|------|
| `DATABASE_URL` | URL do Neon dev | URL do Neon prod |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://www.hivebudget.com` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://www.hivebudget.com` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook de teste | Webhook de prod |
| `NODE_ENV` | `development` | `production` |

### Fase 3: Google OAuth

- [ ] Adicionar URIs de callback no Google Cloud Console:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://www.hivebudget.com/api/auth/callback/google`

### Fase 4: Telegram Bot

**Opção A: Mesmo bot** (mais simples)
- Funciona, mas mensagens de dev e prod vão para o mesmo bot

**Opção B: Bots separados** (recomendado)
- [ ] Criar bot de dev no BotFather: `@hivebudget_dev_bot`
- [ ] Usar tokens diferentes em cada ambiente

### Fase 5: Stripe

- [ ] Configurar chaves de teste para dev (`sk_test_...`, `pk_test_...`)
- [ ] Configurar chaves live para prod (`sk_live_...`, `pk_live_...`)
- [ ] Criar webhooks separados no Stripe Dashboard

### Fase 6: Outros Serviços

- [ ] Sentry: Configurar ambientes separados (development, production)
- [ ] PostHog: Usar mesmo projeto, filtrar por environment
- [ ] Inngest: Configurar ambientes separados

### Fase 7: Arquivos Locais

```bash
# Dev local
cp .env.example .env.local

# Para testar build de produção localmente
cp .env.example .env.production.local
```

### Fase 8: Deploy

- [ ] Rodar migrações no banco de produção: `npx drizzle-kit push`
- [ ] Verificar variáveis de ambiente na Vercel
- [ ] Testar fluxo de autenticação em produção
