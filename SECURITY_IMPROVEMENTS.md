# Melhorias de Segurança - HiveBudget

Este documento descreve todas as melhorias de segurança implementadas, o que você precisa testar e o que precisa configurar para desenvolvimento local e produção.

---

## O que foi implementado

### 1. Logger Estruturado (`src/shared/lib/logger.ts`)

**O que faz:**
- Substitui todos os `console.log/error` por um logger com módulos nomeados
- Em **desenvolvimento**: loga no console com nome do módulo (ex: `[stripe-webhook] Event received`)
- Em **produção**: envia erros para o Sentry e adiciona breadcrumbs para info/warn
- **PII scrubbing automático**: emails, tokens e secrets são redactados em produção
- Campos sensíveis em contexto (email, name, password, token, secret) são substituídos por `[REDACTED]`

**Como testar:**
```bash
# Em dev, os logs aparecem no terminal normalmente:
pnpm dev
# Faça qualquer ação (login, criar transação, etc.) e veja os logs formatados

# Para testar o scrubbing, altere NODE_ENV temporariamente:
NODE_ENV=production node -e "
  const { createLogger } = require('./src/shared/lib/logger');
  const logger = createLogger('test');
  logger.info('User logged in', { email: 'test@email.com', userId: '123' });
  // email deve aparecer como [REDACTED]
"
```

**Arquivos modificados:** 48 arquivos de API routes, 5 arquivos de integração, 6 arquivos de shared lib

---

### 2. Rate Limiting (`src/shared/lib/security/rate-limit.ts`)

**O que faz:**
- Rate limiting in-memory por IP address
- Limpa entries expiradas automaticamente a cada 5 minutos
- Retorna HTTP 429 com headers padrão (`Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`)

**Limites configurados:**
| Endpoint | Limite | Janela |
|----------|--------|--------|
| Formulário de contato | 3 requests | 10 minutos |
| Waitlist | 3 requests | 10 minutos |
| Sign-up | 5 requests | 1 minuto |
| Reset password | 5 requests | 1 minuto |
| Stripe webhook | 100 requests | 1 minuto |
| API geral | 60 requests | 1 minuto |
| Admin | 30 requests | 1 minuto |

**Como testar:**
```bash
# Teste o rate limit do formulário de contato:
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/contact \
    -H "Content-Type: application/json" \
    -d '{"name":"Teste","email":"test@test.com","message":"teste"}' \
    -w "\nHTTP Status: %{http_code}\n"
done
# As 3 primeiras devem retornar 200, as próximas 429

# Teste o rate limit de sign-up:
for i in {1..7}; do
  curl -X POST http://localhost:3000/api/auth/signup-request \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}' \
    -w "\nHTTP Status: %{http_code}\n"
done
# As 5 primeiras devem retornar 200/400, as próximas 429
```

**Limitação:** O rate limiter é in-memory, ou seja, funciona por instância do servidor. Se você escalar para múltiplas instâncias (Vercel Edge Functions), cada instância terá seu próprio contador. Para produção em escala, considere migrar para Upstash Redis.

**O que ajustar para produção:**
- Se o app estiver atrás do Cloudflare, os headers `x-forwarded-for` e `x-real-ip` devem funcionar automaticamente
- Se quiser rate limiting distribuído, substitua o `Map` in-memory por Upstash Redis (`@upstash/ratelimit`)

---

### 3. Audit Logging (`src/shared/lib/security/audit-log.ts` + `src/db/schema/audit-log.ts`)

**O que faz:**
- Registra ações sensíveis no banco de dados (tabela `audit_logs`)
- Captura: userId, action, resource, resourceId, details (JSONB), IP, User-Agent, timestamp
- Non-blocking (fire-and-forget) - nunca interrompe o fluxo principal

**Ações auditadas:**
| Ação | Onde |
|------|------|
| `admin.database_reset` | Reset do banco de dados |
| `admin.mock_data` | Criação de dados de teste |
| `admin.coupon_create` | Criação de cupons |
| `budget.create` | Criação de orçamento |
| `budget.invite` | Envio de convite |
| `export.data` | Exportação de dados |

**Como testar:**
```bash
# 1. Primeiro, crie a tabela no banco:
pnpm db:push

# 2. Faça uma ação auditada (ex: criar um orçamento na UI)

# 3. Verifique os logs no banco:
# Via Drizzle Studio:
pnpm db:studio
# Navegue até a tabela "audit_logs"

# Ou via SQL direto:
# SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

**O que ajustar:**
- Depois de rodar `pnpm db:push`, a tabela `audit_logs` será criada automaticamente
- Nenhuma configuração adicional necessária

---

### 4. Middleware de Segurança (`src/middleware.ts`)

**O que faz:**
- Adiciona `X-Request-Id` (UUID) a todas as respostas para rastreabilidade
- Adiciona `X-Request-Start` em rotas de API para medir latência
- Bloqueia padrões suspeitos em URLs: SQL injection, script injection, path traversal, null bytes
- Adiciona headers de segurança extras em rotas de API

**Como testar:**
```bash
# Teste request ID:
curl -I http://localhost:3000/api/app/me
# Deve ter o header: X-Request-Id: <uuid>

# Teste bloqueio de SQL injection:
curl "http://localhost:3000/api/app/transactions?q=UNION+SELECT+*+FROM+users"
# Deve retornar 400 Bad Request

# Teste bloqueio de path traversal:
curl "http://localhost:3000/api/app/../../etc/passwd"
# Deve retornar 400 Bad Request

# Teste bloqueio de script injection:
curl "http://localhost:3000/api/app/transactions?q=<script>alert(1)</script>"
# Deve retornar 400 Bad Request
```

---

### 5. Branding Corrigido

**O que foi feito:**
- README.md atualizado de "Indie Kit" para "HiveBudget"
- Componente `indiekit-text-reveal.tsx` renomeado para `hivebudget-text-reveal.tsx`
- Todas as referências a "Indie Kit" e "indiekit.pro" removidas
- Email hardcoded (`alisonbessa@gmail.com`) removido da página de mock data

---

### 6. `.env.example` Criado

**O que faz:**
- Documenta todas as variáveis de ambiente necessárias
- Separadas por categoria (Database, Auth, Email, Stripe, etc.)
- Indica quais são obrigatórias e quais são opcionais

---

## Configuração para Desenvolvimento Local

### Passo a passo:

```bash
# 1. Copiar .env.example para .env.local
cp .env.example .env.local

# 2. Preencher as variáveis obrigatórias:
#    - DATABASE_URL (criar banco no Neon: https://neon.tech)
#    - AUTH_SECRET (gerar com: openssl rand -base64 32)
#    - SESSION_SECRET (gerar com: openssl rand -base64 32)
#    - RESEND_API_KEY (obter em: https://resend.com)
#    - RESEND_FROM_EMAIL (ex: noreply@yourdomain.com)
#    - SUPER_ADMIN_EMAILS (seu email)
#    - CRON_PASSWORD (qualquer string segura)
#    - NEXT_PUBLIC_SIGNIN_ENABLED=true

# 3. Instalar dependências
pnpm install

# 4. Criar tabelas no banco (inclui a nova tabela audit_logs)
pnpm db:push

# 5. Criar planos de assinatura
pnpm db:seed-plans

# 6. Iniciar o servidor
pnpm dev
```

### Variáveis mínimas para rodar local (sem Stripe/Telegram):

```env
DATABASE_URL=postgresql://...
AUTH_SECRET=<gerado>
SESSION_SECRET=<gerado>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SIGNIN_ENABLED=true
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
SUPER_ADMIN_EMAILS=seu@email.com
CRON_USERNAME=cron
CRON_PASSWORD=<qualquer-coisa>
```

---

## Configuração para Produção

### Checklist de Deploy:

#### Variáveis de ambiente obrigatórias:
- [ ] `DATABASE_URL` - String de conexão do PostgreSQL de produção
- [ ] `AUTH_SECRET` - Secret único para produção (diferente do dev!)
- [ ] `SESSION_SECRET` - Secret único para produção
- [ ] `NEXTAUTH_URL` - URL do seu domínio (ex: `https://app.hivebudget.com`)
- [ ] `NEXT_PUBLIC_APP_URL` - Mesma URL pública
- [ ] `NEXT_PUBLIC_SIGNIN_ENABLED` - `true` para permitir logins
- [ ] `RESEND_API_KEY` - Chave de produção do Resend
- [ ] `RESEND_FROM_EMAIL` - Email com domínio verificado no Resend
- [ ] `STRIPE_SECRET_KEY` - Chave **live** do Stripe (não test!)
- [ ] `STRIPE_WEBHOOK_SECRET` - Secret do webhook de produção
- [ ] `SUPER_ADMIN_EMAILS` - Emails dos admins
- [ ] `CRON_USERNAME` / `CRON_PASSWORD` - Credenciais seguras

#### Variáveis recomendadas:
- [ ] `SENTRY_DSN` - Para monitoramento de erros em produção
- [ ] `SENTRY_AUTH_TOKEN` - Para source maps
- [ ] `STRIPE_TRIAL_DAYS` - Período de trial (default: 30)
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Se quiser login com Google

#### Variáveis opcionais:
- [ ] `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` - Se usar o bot
- [ ] `GEMINI_API_KEY` - Se usar IA no Telegram
- [ ] `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` - Para jobs agendados

### Após o deploy:

```bash
# 1. Rodar as migrações (cria tabela audit_logs e outras novas)
pnpm db:push

# 2. Seed dos planos (se ainda não fez)
pnpm db:seed-plans

# 3. Configurar webhook do Stripe apontando para:
#    https://seudominio.com/api/webhooks/stripe

# 4. Configurar Inngest (se usar):
#    Dashboard → Add App → URL: https://seudominio.com/api/inngest

# 5. Verificar que Sentry está recebendo eventos
```

### Testes de verificação pós-deploy:

```bash
# 1. Testar se a app está rodando
curl https://seudominio.com/api/public

# 2. Testar rate limiting
curl -X POST https://seudominio.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","message":"test"}'

# 3. Testar middleware (X-Request-Id deve estar presente)
curl -I https://seudominio.com/

# 4. Testar bloqueio de ataques
curl "https://seudominio.com/api/app/transactions?q=UNION+SELECT+*"
# Deve retornar 400

# 5. Verificar no Sentry se breadcrumbs estão chegando
# (faça login e navegue pela app)

# 6. Verificar audit logs no banco
# SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

## Próximos passos recomendados (não implementados)

### Prioridade Alta:
1. **Configurar Sentry** - Criar conta, obter DSN, adicionar nos env vars
2. **Configurar Inngest** em produção para jobs agendados
3. **Testar todos os fluxos** de pagamento com Stripe test mode

### Prioridade Média:
4. **Rate limiting distribuído** - Migrar de in-memory para Upstash Redis quando escalar
5. **Criptografia de PII** - Implementar field-level encryption para nome/email
6. **Soft delete** para contas de usuário (LGPD compliance)
7. **Padronizar idioma** - Resolver textos em inglês misturados com PT-BR

### Prioridade Baixa:
8. **Adicionar loading.tsx** nas rotas principais do App Router
9. **Remover dependências não usadas** (tw-animate-css, dotenv)
10. **Adicionar página 404** no app principal
11. **Remover sistema de créditos** desabilitado ou limpar completamente
