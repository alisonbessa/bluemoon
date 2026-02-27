# Code Review Completo - HiveBudget

> Análise realizada em 27/02/2026 cobrindo: Arquitetura, Performance, SEO, UX e Segurança.

---

## Resumo Executivo

O HiveBudget é um projeto Next.js 16 bem estruturado com fundações sólidas. A autenticação é robusta (NextAuth v5 + JWT com defesa em profundidade), as queries de banco são eficientes (Drizzle ORM sem N+1), e a validação de input com Zod é abrangente. As principais áreas de melhoria estão em: **CSP header ausente**, **rate limiting não funcional em serverless**, **todas as pages sendo "use client"**, e **falta de middleware.ts do Next.js**.

### Pontuação por Área

| Área | Nota | Destaques |
|------|------|-----------|
| **Arquitetura** | 7/10 | Boa organização, mas falta middleware.ts e muitas pages client-side |
| **Performance** | 7/10 | Boas queries paralelas, mas caching limitado e pages sem SSR |
| **SEO** | 8/10 | Metadata, sitemap, structured data bem feitos; falta CSP e hreflang |
| **UX** | 7/10 | Loading states e skeletons bons; acessibilidade pode melhorar |
| **Segurança** | 8/10 | Forte no geral; CSP ausente e rate limiting precisa de Redis |

---

## 1. ARQUITETURA

### 1.1 Problema: Ausência de `middleware.ts` do Next.js

**Severidade: ALTA**

Não existe um arquivo `middleware.ts` na raiz do `src/`. Toda proteção de rotas é feita via wrappers (`withAuthRequired`) nos handlers de API. Isso significa:

- Não há proteção a nível de edge para páginas protegidas (`/app/*`, `/super-admin/*`)
- Um usuário não autenticado consegue carregar o bundle JavaScript das páginas protegidas antes de ser redirecionado pelo client-side
- O redirecionamento de auth acontece no `useEffect` do layout (`src/app/(in-app)/layout.tsx:223-227`), gerando flash de conteúdo

**Recomendação:** Criar `src/middleware.ts` com proteção edge-level:

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/app") || pathname.startsWith("/super-admin")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  if (pathname.startsWith("/super-admin")) {
    const adminEmails = process.env.SUPER_ADMIN_EMAILS?.split(",") || [];
    if (!adminEmails.includes(req.auth?.user?.email || "")) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
  }
});

export const config = {
  matcher: ["/app/:path*", "/super-admin/:path*"],
};
```

### 1.2 Problema: TODAS as pages são "use client"

**Severidade: MÉDIA**

Encontrei **32 páginas** com `"use client"` no topo, incluindo todas em `/app/(in-app)/`. Isso significa:

- Nenhuma página da aplicação usa Server Components
- Todo o HTML é renderizado no cliente, não no servidor
- Impacto negativo no Time to First Byte (TTFB) e First Contentful Paint (FCP)
- Bundle JavaScript maior que o necessário

**Páginas que DEVERIAM ser Server Components:**
- `/app/(in-app)/app/budget/page.tsx` - dados podem ser fetched server-side
- `/app/(in-app)/app/transactions/page.tsx` - listagem com dados do banco
- `/app/super-admin/*` - todas as páginas admin

**Recomendação:** Separar data fetching (server) de interatividade (client):
```
// page.tsx (Server Component - sem "use client")
async function TransactionsPage() {
  const data = await getTransactions();
  return <TransactionsClient initialData={data} />;
}

// transactions-client.tsx ("use client")
function TransactionsClient({ initialData }) { ... }
```

### 1.3 Problema: Layout in-app com muita lógica

**Severidade: MÉDIA**

O arquivo `src/app/(in-app)/layout.tsx` tem 316 linhas com:
- Verificação de autenticação no `useEffect`
- Inicialização de budget
- Tutorial state
- Celebration modal
- Subscription gating

**Recomendação:** Extrair em hooks dedicados:
- `useAuthGuard()` - redirecionamento de auth
- `useBudgetInitializer()` - auto-criação de budget
- `useTutorialFlow()` - lógica de tutorial
- Mover verificação de auth para middleware.ts

### 1.4 Problema: Duplicação de constantes

**Severidade: BAIXA**

`SUBSCRIPTION_EXEMPT_ROLES` está definido em dois lugares:
- `src/app/(in-app)/layout.tsx:23`
- `src/shared/lib/auth/withSubscriptionRequired.ts:7`

**Recomendação:** Centralizar em um arquivo de constantes compartilhado.

---

## 2. PERFORMANCE

### 2.1 Problema: Caching aplicado em apenas 2 rotas de API

**Severidade: ALTA**

Somente `/api/app/dashboard/stats` e `/api/app/dashboard/insights` usam `cachedResponse()`. As outras 45+ rotas de API retornam respostas sem cache headers.

**Rotas que se beneficiariam de caching:**
- `GET /api/app/accounts` - dados mudam com baixa frequência
- `GET /api/app/categories` - raramente mudam
- `GET /api/app/income-sources` - raramente mudam
- `GET /api/app/goals` - mudam moderadamente
- `GET /api/app/plans` - quase nunca mudam
- `GET /api/app/me` - dados do usuário

**Recomendação:** Aplicar `cachedResponse()` nas rotas GET com intervalos adequados:
```typescript
// categorias, income-sources: mudam pouco
return cachedResponse(data, { maxAge: 120, staleWhileRevalidate: 600 });

// accounts: mudam com transações
return cachedResponse(data, { maxAge: 30, staleWhileRevalidate: 120 });

// plans: quase estáticos
return cachedResponse(data, { maxAge: 3600, staleWhileRevalidate: 86400 });
```

### 2.2 Problema: `getUserBudgetIds()` chamado repetidamente

**Severidade: MÉDIA**

A função `getUserBudgetIds()` (`src/shared/lib/api/permissions.ts:15-21`) faz uma query ao banco toda vez que é chamada. Ela é invocada em praticamente toda rota de API autenticada. Para um único request de dashboard, pode ser chamada múltiplas vezes.

**Recomendação:** Cachear no `withAuthRequired` context:
```typescript
const withAuthRequired = (handler) => {
  return async (req, context) => {
    // ... auth check ...
    let _budgetIds: string[] | null = null;
    const getBudgetIds = async () => {
      if (!_budgetIds) _budgetIds = await getUserBudgetIds(userId);
      return _budgetIds;
    };
    return handler(req, { ...context, getBudgetIds });
  };
};
```

### 2.3 Problema: N+1 nas credit cards do dashboard stats

**Severidade: MÉDIA**

Em `src/app/api/app/dashboard/stats/route.ts:151-185`, após buscar os cartões de crédito, cada cartão gera uma query individual:
```typescript
const creditCards = await Promise.all(
  creditCardAccounts.map(async (cc) => {
    const [result] = await db.select(...).from(transactions)...
  })
);
```

Embora use `Promise.all`, cada cartão ainda gera uma query separada. Com 5+ cartões, são 5+ queries.

**Recomendação:** Uma única query agregada com `GROUP BY account_id`:
```sql
SELECT account_id, COALESCE(ABS(SUM(amount)), 0) as spent
FROM transactions
WHERE account_id IN (...creditCardIds)
  AND type = 'expense'
  AND date BETWEEN $start AND $end
GROUP BY account_id
```

### 2.4 Problema: Imagens sem `sizes` prop com `fill`

**Severidade: BAIXA**

O blog detail page (`src/app/(website-layout)/blog/[slug]/page.tsx:149-155`) usa `<Image fill>` sem `sizes`:
```tsx
<Image src={...} alt={...} fill className="object-cover rounded-xl" />
```

Sem `sizes`, o Next.js não sabe otimizar o tamanho da imagem para cada breakpoint.

**Recomendação:** Adicionar `sizes` prop:
```tsx
<Image fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 800px" />
```

### 2.5 Problema: Lazy loading limitado

**Severidade: BAIXA**

`dynamic()` só é usado para charts no dashboard (`src/app/(in-app)/app/page.tsx:35-46`). Componentes pesados como `react-icon-cloud`, `canvas-confetti` e `recharts` em super-admin não usam lazy loading.

**Recomendação:** Aplicar `dynamic()` com `ssr: false` para componentes pesados não críticos.

---

## 3. SEO

### 3.1 Positivo: Base sólida

O projeto já tem uma base SEO excelente:
- Metadata com template no root layout (`%s | HiveBudget`)
- `robots.ts` bloqueando `/app/`, `/api/`, `/super-admin/`
- `sitemap.ts` com páginas estáticas, políticas e blog posts
- Structured data (JSON-LD) com WebSite, SoftwareApplication, Organization
- Blog posts com `generateStaticParams()`, `generateMetadata()`, ArticleJsonLd, BreadcrumbJsonLd
- Open Graph e Twitter cards na homepage e blog
- `lang="pt-BR"` no HTML
- Canonical URLs nos blog posts

### 3.2 Problema: Structured data com dados fictícios

**Severidade: MÉDIA**

Em `src/shared/seo/StructuredData.tsx:59-65`:
```typescript
aggregateRating: {
  "@type": "AggregateRating",
  ratingValue: "4.8",
  ratingCount: "127",
  bestRating: "5",
  worstRating: "1",
},
```

Dados de rating hardcoded podem ser considerados spam pelo Google se não refletem avaliações reais.

**Recomendação:** Remover `aggregateRating` até ter dados reais de avaliação, ou implementar um sistema de reviews.

### 3.3 Problema: SearchAction aponta para rota inexistente

**Severidade: BAIXA**

`StructuredData.tsx:28`: `urlTemplate: \`${baseUrl}/search?q={search_term_string}\``

Não existe uma página `/search` na aplicação.

**Recomendação:** Remover o `potentialAction.SearchAction` do structured data ou implementar uma página de busca.

### 3.4 Problema: Falta FAQ structured data

**Severidade: BAIXA**

A homepage tem uma seção de FAQ com 12 perguntas/respostas (`src/app/(website-layout)/page.tsx:58-119`), mas não utiliza o schema FAQPage do JSON-LD.

**Recomendação:** Adicionar FAQ structured data:
```typescript
<StructuredData type="FAQPage" data={{ mainEntity: faqItems.map(item => ({
  "@type": "Question",
  name: item.question,
  acceptedAnswer: { "@type": "Answer", text: item.answer }
})) }} />
```

### 3.5 Problema: `metadataBase` inconsistente

**Severidade: BAIXA**

`metadataBase` só é definido em `generateMetadata` do blog detail page, mas não no root layout. Isso pode causar URLs relativas inconsistentes nos og:tags.

**Recomendação:** Definir `metadataBase` no `src/app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  // ...
};
```

### 3.6 Problema: Página de contato sem metadata

**Severidade: MÉDIA**

A página `/contact` (`src/app/(website-layout)/contact/page.tsx`) não exporta metadata. Falta título, descrição, Open Graph, Twitter cards e canonical URL.

**Recomendação:** Adicionar `export const metadata` com todos os campos SEO.

### 3.7 Problema: Página de sucesso da waitlist sem OG tags

**Severidade: BAIXA**

`/join-waitlist/success` tem metadata mínima - sem Open Graph, Twitter cards ou canonical.

---

## 4. UX

### 4.1 Positivo: Loading states bem implementados

- Loading skeletons em `/app/accounts/loading.tsx`, `/app/budget/loading.tsx`, etc.
- `DashboardSkeleton` customizado no layout in-app
- Lazy loading com skeleton para charts
- `keepPreviousData: true` no SWR evita flash de loading

### 4.2 Problema: Error boundaries limitados

**Severidade: MÉDIA**

Existem `error.tsx` em `/app/(auth)/`, `/app/(in-app)/`, e root, mas:
- Nenhum error boundary em `/app/(website-layout)/`
- Sem error handling específico por feature (budget, transactions, etc.)
- Erros de API mostram mensagens técnicas ao usuário

**Recomendação:** Adicionar `error.tsx` em `(website-layout)` e criar error boundaries por feature.

### 4.3 Problema: Formulários sem feedback de submissão

**Severidade: MÉDIA**

Muitos formulários não mostram estado de loading durante submissão. Padrão encontrado em várias pages:
```typescript
const onSubmit = async (data) => {
  const response = await fetch("/api/...", { ... });
  if (response.ok) {
    toast.success("Sucesso!");
  }
};
```

Sem `isSubmitting` state, o usuário pode clicar múltiplas vezes.

**Recomendação:** Usar `formState.isSubmitting` do react-hook-form:
```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? "Salvando..." : "Salvar"}
</Button>
```

### 4.4 Problema: Textos de "Related Articles" em inglês

**Severidade: BAIXA**

No blog detail page (`src/app/(website-layout)/blog/[slug]/page.tsx:221`):
```tsx
<h2>Related Articles</h2>
```

Todo o restante do app está em português.

**Recomendação:** Traduzir para "Artigos Relacionados".

### 4.5 Problema: Empty states inconsistentes

**Severidade: MÉDIA**

O componente `EmptyState` existe mas é pouco utilizado. O dashboard tem empty state para metas (`src/app/(in-app)/app/page.tsx:229-243`), mas listas de transações, contas e categorias usam texto simples sem CTAs.

**Recomendação:** Aplicar o componente `EmptyState` com ícone, descrição e CTA em todas as listagens.

### 4.6 Problema: Falta `prefers-reduced-motion`

**Severidade: BAIXA**

Animações (accordion, marquee, shimmer, progress bar) não respeitam `prefers-reduced-motion`. Isso é um requisito de acessibilidade WCAG 2.1.

**Recomendação:** Adicionar media query no CSS global:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 4.7 Problema: Falta `aria-live` para toasts

**Severidade: BAIXA**

As notificações toast (Sonner) não usam `aria-live="polite"` ou `role="status"` para anunciar mudanças a leitores de tela.

### 4.8 Problema: Sem skip-to-content link

**Severidade: BAIXA**

Falta link de "pular para conteúdo" para navegação por teclado, especialmente útil nas páginas com sidebar.

---

## 5. SEGURANÇA

### 5.1 Problema: Content-Security-Policy (CSP) ausente

**Severidade: ALTA**

O `next.config.ts` tem vários security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), mas **não tem CSP**. CSP é a defesa primária contra XSS.

**Recomendação:** Adicionar ao `securityHeaders` em `next.config.ts`:
```typescript
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com https://vitals.vercel-insights.com; frame-src https://js.stripe.com;"
},
```

### 5.2 Problema: Rate limiting não funciona em serverless (Vercel)

**Severidade: ALTA**

O rate limiter (`src/shared/lib/security/rate-limit.ts`) usa um `Map()` em memória. No Vercel, cada invocação serverless tem memória isolada, tornando o rate limiting **efetivamente inoperante** em produção.

**Recomendação:** Migrar para Upstash Redis:
```bash
pnpm add @upstash/ratelimit @upstash/redis
```

### 5.3 Problema: Rotas `/api/app/*` sem rate limiting

**Severidade: MÉDIA**

Rate limiting está aplicado apenas em 5 rotas (contact, waitlist, signup, reset-password, stripe webhook). Nenhuma das 47+ rotas autenticadas tem rate limiting.

**Recomendação:** Aplicar `withRateLimit` ou `checkRateLimit` nas rotas de mutação (POST/PUT/DELETE).

### 5.4 Problema: Signup expõe existência de email

**Severidade: MÉDIA**

`src/app/api/auth/signup-request/route.ts` retorna erro explícito quando email já existe:
```typescript
{ error: "An account with this email already exists" }
```

Isso permite enumeração de emails. O endpoint de reset-password corretamente retorna mensagem genérica.

**Recomendação:** Retornar mensagem genérica e enviar email ao usuário existente informando que já tem conta.

### 5.5 Problema: `parseInt` sem limites nos search params

**Severidade: BAIXA**

Em múltiplas rotas de API:
```typescript
const limit = parseInt(searchParams.get("limit") || "50");
const offset = parseInt(searchParams.get("offset") || "0");
```

Um usuário pode passar `limit=999999999` causando queries pesadas.

**Recomendação:**
```typescript
const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100);
const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
```

### 5.6 Problema: WhatsApp webhook sem verificação de assinatura

**Severidade: MÉDIA**

O endpoint POST do WhatsApp webhook não verifica o header `X-Hub-Signature-256` que a Meta envia com cada payload. O Telegram webhook, por outro lado, verifica o secret token em cada POST.

**Recomendação:** Implementar verificação de assinatura da Meta usando `X-Hub-Signature-256` e o app secret.

### 5.7 Positivo: Práticas de segurança fortes

- `allowDangerousEmailAccountLinking: false` no Google OAuth
- JWT token minimalista (só sub, email, impersonatedBy)
- Impersonação com token encriptado e expiração
- `dangerouslySetInnerHTML` usado apenas em JSON-LD (seguro)
- Uploads restritos a tipos de imagem com limite de tamanho
- Stripe webhook com verificação de assinatura
- Cascading deletes configurados no schema
- LGPD compliance com soft deletes

---

## Prioridades de Implementação

### Prioridade 1 (Crítico - fazer agora)
1. Adicionar header `Content-Security-Policy` no `next.config.ts`
2. Migrar rate limiting para Upstash Redis
3. Criar `middleware.ts` para proteção edge-level

### Prioridade 2 (Importante - próximas sprints)
4. Adicionar rate limiting nas rotas `/api/app/*`
5. Expandir `cachedResponse()` para mais rotas de API
6. Converter pages críticas para Server Components
7. Corrigir signup para não expor existência de email
8. Verificação de assinatura no WhatsApp webhook

### Prioridade 3 (Melhoria - backlog)
9. Consolidar `getUserBudgetIds()` no context de auth
10. Otimizar query de credit cards com GROUP BY
11. Adicionar FAQ structured data na homepage
12. Remover `aggregateRating` fictício do structured data
13. Adicionar `metadataBase` no root layout
14. Adicionar metadata na página de contato
15. Adicionar `sizes` nas Image com `fill`
16. Traduzir "Related Articles" para português
17. Adicionar error boundary em `(website-layout)`
18. Implementar `parseInt` com limites nos search params
19. Lazy loading para componentes pesados além do dashboard
20. Implementar empty states consistentes em todas as listagens
21. Adicionar `prefers-reduced-motion` no CSS global
22. Adicionar skip-to-content link no layout
