# Relatório de Auditoria UI/UX — HiveBudget

> Documento de referência para o Designer refatorar o visual da aplicação.
> Data: 2026-04-19

---

## 1. Estrutura Geral

O aplicativo Next.js está organizado em três camadas principais:

**Rotas e Layouts:**
- `/app/(website-layout)` — páginas públicas (landing, blog, contato, políticas)
- `/app/(auth)` — fluxo de autenticação (sign-in, sign-up, reset-password)
- `/app/(in-app)` — dashboard e funcionalidades do aplicativo

**Diretórios de Componentes:**
- `/src/shared/ui/` — primitivos shadcn/ui customizados (~30 componentes)
- `/src/shared/molecules/` — composições médias (page-header, empty-state, delete-confirm-dialog)
- `/src/shared/organisms/` — componentes complexos (layouts, shells)
- `/src/features/` — domínios de negócio (accounts, transactions, categories, goals, income, budget, insights)

**Páginas Identificadas:**
Landing, auth, dashboard (/app), budget/planejamento, transactions, goals, accounts, income, categories, insights, settings, profile, plan, subscribe, blog, contact e políticas.

---

## 2. Sistema de Design & Tokens

**Configuração Tailwind & Cores (`globals.css`):**
- Tokens em **OKLCH** (perceptualmente uniforme): `--primary`, `--secondary`, `--accent`, `--destructive`, `--muted`
- Suporte a dark mode com variáveis CSS bem definidas
- Escala de sombras (`--shadow-2xs` até `--shadow-2xl`) consistente
- Tipografia: **Plus Jakarta Sans** (base/heading), **Source Serif 4** (serif), **JetBrains Mono** (mono)
- Border-radius padronizado: `--radius: 0.5rem` (sm, md, lg)

### Problemas Identificados

⚠️ **CRÍTICO — Cores hardcoded em `account-card.tsx` (linhas 74, 88, 134, 162, 175):**
```tsx
style={{ backgroundColor: account.color || "#6366f1" + "20" }} // hex hardcoded
className={cn("text-green-600 dark:text-green-400")}
className={cn("text-destructive" / "text-green-500" / "bg-yellow-500")}
```
Não seguem o sistema de tokens. Devem usar `--primary`, `--success`, `--warning`.

⚠️ **Contact page (`contact.tsx:98`):**
```tsx
<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff33_1px,transparent_1px)]" />
```
Gradientes inline em vez de classes reutilizáveis.

✅ **Pontos Fortes:**
- Tokens organizados em CSS custom properties
- Dark mode totalmente suportado
- Escala tipográfica coerente

---

## 3. Uso de Componentes & Patterns

**shadcn/ui instalados:** Accordion, Alert Dialog, Avatar, Checkbox, Collapsible, Context Menu, Dialog, Dropdown Menu, Hover Card, Label, Menubar, Navigation Menu, Popover, Progress, Radio Group, Scroll Area, Select, Separator, Slider, Switch, Tabs, Toggle, Tooltip.

### Padrões Encontrados

✅ **Form Primitives consistente:**
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage` (`form.tsx`)
- Integração `react-hook-form` + `zod`
- Bom exemplo: `contact/page.tsx` (linhas 42-74)

✅ **Input:**
- Focus-visible, aria-invalid e estados desabilitados bem implementados
- `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`

⚠️ **Button inconsistências:**
- Variants OK (default, destructive, outline, secondary, ghost, link)
- **`setup/page.tsx:73`:** usa `<button>` raw com inline className em vez de `<Button>`

⚠️ **Dialog/Modal:**
- `AlertDialog` bem usado em `delete-confirm-dialog.tsx` ✅
- MAS tem cores inline (linhas 48-51):
```tsx
variant === "destructive"
  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
  : "bg-amber-600 text-white hover:bg-amber-700" // hardcoded amber!
```

---

## 4. Tipografia & Escala

✅ **Typography System (`typography.tsx`):**
```tsx
className={cn("text-2xl sm:text-3xl font-bold tracking-tight", className)}
className={cn("text-sm sm:text-base text-muted-foreground", className)}
```
Breakpoints consistentes.

⚠️ **Inconsistências:**
- `setup/page.tsx:69` — `<h2 className="text-2xl font-bold">` não usa Typography component
- `auth-form.tsx:161-162` — labels sem className padronizado
- Alguns headers usam h1/h2 raw

---

## 5. Formulários & Validação

✅ **Pontos Fortes:**
- Validação com Zod em `auth-form.tsx`, `contact/page.tsx`, `plan-form.tsx`
- Feedback via `<FormMessage>`
- Loading com `Loader2` durante submit
- Disabled state em botões

### Issues

⚠️ **Input heights inconsistentes (`auth-form.tsx:189, 213, 240`):**
```tsx
<Input className="w-full py-6" /> // padding custom em vez de size prop
<Button className="w-full py-6" />
```
Deveria usar `size="lg"` em ambos.

⚠️ **Loading states ausentes:**
- `account-form.tsx` — sem `Loader2` visual durante submit
- `goal-form-modal.tsx` — status de loading não é claro

⚠️ **Indicador de campo obrigatório:**
- `FormLabel` não indica required com `*`
- `FormMessage` só aparece após erro

---

## 6. Navegação & Layout

✅ **Header consistente (`app-header.tsx`):**
- Logo + brand responsivo (hidden em sm)
- Mobile hamburger `md:hidden`
- Sticky `z-50`

✅ **Sidebar (`app-sidebar.tsx`):**
- Expansível/colapsível com cookie persistence
- Navigation items com tutorialId (onboarding)
- Responsive: sheet em mobile, sidebar em desktop
- View mode selector (Unified vs Separate privacy)

### Issues

⚠️ **Navigation ativa:**
- Sem `aria-current="page"`
- `usePathname()` comparado direto, sem normalização
- Hierarquia visual fraca em breakpoints intermediários

⚠️ **Breadcrumbs:**
- **Zero** breadcrumb implementado
- Navegação difícil em settings → profile → subsections

---

## 7. Empty States & Loading

✅ **Molecules bem feitos:**
- `EmptyState` com icon, title, description, ações
- `LoadingState` com tamanhos (sm/md/lg)
- `DashboardSkeleton` no app-shell

### Issues
- Skeleton usa `bg-muted` hardcoded
- `LoadingState` fullHeight defaulta para `60vh` (deveria ser `100vh` ou `100%`)
- `AccountsClient`, `GoalsClient` não mostram empty state quando 0 itens

---

## 8. Responsividade & Mobile

✅ **Breakpoints corretos:** `sm:`, `md:`, `lg:` usados consistentemente (34 instâncias de `md:hidden`, `sm:flex-row`).

### Issues
- `PageHeader` (`page-header.tsx:30-34`) — actions container fica full-width em mobile
- `AuthForm` — `py-6` muito grande em inputs mobile (linhas 189, 213)
- `ContactPage` — `p-8` pesado em mobile

⚠️ **Touch targets:**
- `Button size="icon"` gera 36px ✅ (OK para WCAG)
- MAS hover-only com `opacity-0` em `account-card:97` **quebra UX mobile** (não há hover!)

---

## 9. Mecanismos de Feedback

✅ **Toast (sonner):** Usado corretamente em auth, contact, profile, setup. Mensagens claras com auto-dismiss.

### Issues

⚠️ **Edit/Delete com `opacity-0 group-hover`:**
- `account-card.tsx:97` — botões invisíveis em touch devices
- Usuários mobile **não conseguem editar/deletar contas**

⚠️ **Feedback de erro em formulários:**
- Apenas cor vermelha (sem ícone/badge)
- `aria-invalid` sem styling visual extra

---

## 10. Acessibilidade

### Pontos Positivos ✅
- `aria-invalid` em inputs (`form.tsx:119`)
- `aria-describedby` linking label→description→message
- `skip-to-content` link (`globals.css:268-283`)
- Respect `prefers-reduced-motion` (`globals.css:287-296`)

### Faltas Críticas ⚠️
- **Role attributes insuficientes:** apenas 52 instâncias em 100+ componentes. Faltam `role="navigation"`, `role="main"`, `role="region"`
- **Alt text:**
  - Logo ✅
  - Account icons emojis (account-card.tsx:76) ❌
  - Contact page icons (contact.tsx:149) ❌
- **Keyboard:**
  - `SIDEBAR_KEYBOARD_SHORTCUT = "b"` definido mas **nunca usado** no código
  - Focus trap em modals não verificado
- **Focus indicators:**
  - Inputs OK
  - Buttons de setup/contact sem focus styling visível

---

## 11. Dashboard & App Shell

✅ **Bem estruturado:**
- `AppShell` com `AppHeader` + `AppSidebar`
- `SidebarProvider` para context
- `FloatingChatbot` dinâmico (`dynamic()` com `ssr: false`) ✅
- `TutorialProvider` integrado

### Issues
- `AccountCard` — edit/delete invisíveis em mobile
- `DashboardSkeleton` sem Suspense boundaries granulares

---

## 12. Landing & Marketing

✅ **Componentes:** Hero2, CTA1, CTA2, FAQs, Testimonials, ForCouples, Pricing, HowItWorks.

### Issues
- `ContactPage` com inline CSS gradient
- `WebsiteFAQs` tag `<aside>` sem `aria-label`
- Pricing table — acessibilidade de comparação não verificada
- CTA buttons — verificar link `/app` vs `/sign-up`

---

## 13. Settings & Perfil

✅ **Bem separado:** ProfileCard, PlanCard, AppearanceCard, DataPrivacyCard, SupportCard.

### Issues
- `ProfileCard:66` — Avatar default usa "U", deveria gerar initials
- Avatar truncate em mobile pode cortar texto (linhas 95-96)
- Sem skeleton durante `muteUser` refresh

---

## 14. Problemas & Oportunidades (Prioridades)

### 🔴 Críticos

1. **Hardcoded colors em `account-card.tsx`** (linhas 74, 88, 134, 162, 175)
   - Impacto: dark mode quebrado em indicadores
   - Solução: usar tokens CSS ou criar `--success`

2. **`setup/page.tsx:73` — Raw `<button>` HTML**
   - Impacto: estilo inconsistente, falta a11y
   - Solução: trocar por `<Button>`

3. **Mobile edit/delete invisíveis (`account-card.tsx:97`)**
   - Impacto: usuários mobile não editam contas
   - Solução: `hidden md:opacity-0 md:group-hover:opacity-100` ou context menu

### 🟡 Médios

4. **`delete-confirm-dialog.tsx:48`** — `bg-amber-600` hardcoded → usar `--warning`
5. **`auth-form.tsx:189, 213, 240`** — `py-6` custom → usar `size="lg"`
6. **Required fields** — adicionar `*` em FormLabel
7. **Progress bar colors em account-card** (linhas 172-176) — usar tokens
8. **Breadcrumbs ausentes** — implementar em settings/insights
9. **`aria-current="page"`** ausente na navegação
10. **Alt text** em ícones (account, contact)

### 🟢 Nice-to-have

11. Form submission — desabilitar fields durante submit
12. Skeletons — adicionar shimmer animation
13. Modal focus management — verificar trap e restoration
14. ContactPage — mover gradiente para classe
15. TooltipContent — verificar overflow em mobile

---

## 15. Recomendações Finais para Designer

### Imediato
- [ ] Criar token `--success: oklch(0.7 0.1 150)` para indicadores
- [ ] Remover hex hardcoded (`#6366f1`, `#ffffff33`, `bg-amber-600`)
- [ ] Converter setup page raw button para `<Button>`
- [ ] Adicionar `*` visual em FormLabel required
- [ ] Fix mobile edit/delete em `account-card`

### Curto Prazo (1–2 sprints)
- [ ] Auditoria completa de `aria-label` e alt text
- [ ] Add `aria-current="page"` em navegação ativa
- [ ] Padronizar button padding (remover `py-6` custom)
- [ ] Criar `Breadcrumb` component
- [ ] Review focus ring (contact page, setup)

### Médio Prazo
- [ ] Implementar shortcut visual para Sidebar toggle
- [ ] Shimmer animation em skeletons
- [ ] Wrapper `ToastError` para styling consistente
- [ ] `FormDescription` em inputs complexos
- [ ] Progressive disclosure em settings

---

## Resumo Executivo

- Aplicação **bem estruturada** com bom uso de shadcn/ui e design tokens
- **Críticos:** cores hardcoded, mobile a11y de edit buttons, aria labels ausentes
- ~**50% do refactor** é consolidação de tokens e remoção de valores hardcoded
- Dark mode bem suportado, mas alguns componentes ainda com cores fixas
- Responsividade geral boa
- Tipografia consistente, mas alguns headers usam raw HTML em vez de `Typography`
