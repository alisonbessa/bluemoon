# Plano: Blog com CMS via Super Admin + Melhorias de SEO

## Contexto

O HiveBudget já tem uma base sólida de SEO (metadata, sitemap, robots.txt, JSON-LD) e uma estrutura de blog baseada em MDX pronta mas sem conteúdo. O objetivo é migrar o blog para um sistema database-driven gerenciável via super-admin, com editor rico, e implementar melhorias de SEO adicionais.

---

## Parte 1: Melhorias de SEO (Quick Wins)

### 1.1 - FAQ Schema na Homepage
- Adicionar `FAQPage` JSON-LD structured data na homepage para as 12 perguntas do FAQ
- Isso gera rich snippets no Google (accordion de perguntas diretamente nos resultados de busca)

### 1.2 - Melhorar metadata do Blog
- Trocar textos em inglês ("Articles", "Discover how to use") para português
- Adicionar keywords mais específicas por página

### 1.3 - OG Images Dinâmicas
- Usar `@vercel/og` (já instalado) para gerar imagens OG dinâmicas para cada blog post
- Rota: `/api/og?title=...&description=...`

---

## Parte 2: Sistema de Blog Database-Driven

### Abordagem Escolhida: Database + Rich Text Editor (Tiptap)

**Por que NÃO manter MDX?**
- MDX exige deploy para cada novo post
- Não permite que o admin crie posts sem acesso ao código
- Não escala para produção de conteúdo frequente

**Por que Tiptap?**
- Editor WYSIWYG moderno, extensível, baseado em ProseMirror
- Suporta markdown shortcuts (o admin pode digitar `## ` e vira heading)
- Gera HTML limpo que é fácil de renderizar com `prose` do Tailwind
- Gratuito e open-source (core)
- Melhor DX do que alternativas (Quill, Draft.js, CKEditor)

### 2.1 - Schema do Banco de Dados

Nova tabela `blog_posts`:

```sql
blog_posts:
  - id: uuid (PK)
  - title: varchar(255) NOT NULL
  - slug: varchar(255) NOT NULL UNIQUE
  - description: text (meta description para SEO)
  - content: text NOT NULL (HTML do editor)
  - featured_image: varchar(500) (URL da imagem)
  - tags: text[] (array de tags)
  - status: enum('draft', 'published', 'archived') DEFAULT 'draft'
  - seo_title: varchar(70) (título customizado para SEO, se diferente do title)
  - seo_description: varchar(160) (meta description customizada)
  - seo_keywords: text[] (keywords adicionais)
  - published_at: timestamp (data de publicação)
  - created_at: timestamp DEFAULT now()
  - updated_at: timestamp DEFAULT now()
  - author_name: varchar(100) DEFAULT 'HiveBudget'
```

### 2.2 - API Routes (Super Admin)

```
POST   /api/super-admin/blog          → Criar post
GET    /api/super-admin/blog          → Listar posts (com filtros: status, busca)
GET    /api/super-admin/blog/[id]     → Buscar post por ID
PUT    /api/super-admin/blog/[id]     → Atualizar post
DELETE /api/super-admin/blog/[id]     → Deletar post
POST   /api/super-admin/blog/upload   → Upload de imagem (Vercel Blob)
```

### 2.3 - Páginas do Super Admin

```
/super-admin/blog                → Lista de posts (com status badges, busca, filtros)
/super-admin/blog/create         → Criar novo post (editor Tiptap)
/super-admin/blog/[id]/edit      → Editar post existente
```

**Funcionalidades do Editor:**
- Toolbar: headings (H2-H4), bold, italic, links, listas, imagens, code blocks, citações
- Upload de imagem inline (drag & drop → Vercel Blob)
- Preview lado a lado (editor | preview)
- Campos SEO: título SEO, meta description, keywords, slug customizável
- Auto-geração de slug a partir do título
- Status: Rascunho / Publicado / Arquivado
- Data de publicação (pode agendar)

### 2.4 - Adaptar Blog Público

Migrar as rotas existentes para ler do banco ao invés do filesystem:

**`/blog` (listagem)**
- Buscar apenas posts com `status = 'published'`
- Ordenar por `published_at DESC`
- Manter layout atual (grid de cards)
- Adicionar paginação se necessário

**`/blog/[slug]` (artigo)**
- Buscar post por slug (apenas published)
- Renderizar HTML com `prose` do Tailwind (já funciona, pois o Tiptap gera HTML semântico)
- Manter Table of Contents (extrair headings do HTML)
- Manter Related Articles (por tags)
- Manter todo o SEO (JSON-LD, OG tags, canonical URLs)
- Usar ISR (revalidação a cada 60s) para performance

**Sitemap**
- Atualizar `sitemap.ts` para buscar posts do banco ao invés do filesystem

### 2.5 - Dependências Novas

```
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-image
@tiptap/extension-link
@tiptap/extension-placeholder
@tiptap/extension-heading
@tiptap/extension-code-block-lowlight  (syntax highlighting)
```

---

## Parte 3: Navegação e Integração

### 3.1 - Adicionar "Blog" ao navigation do Super Admin
- Ícone: `FileText` do Lucide
- Posição: após "Feedback"

### 3.2 - Remover sistema MDX antigo
- Deletar `/src/content/blog/` (pasta com MDX files)
- Deletar `/src/shared/lib/mdx/blogs.ts` (funções de leitura MDX)
- Manter `/src/shared/lib/mdx/compile.ts` se usado por docs
- Atualizar imports em todos os arquivos afetados

---

## Ordem de Implementação

1. **Schema do banco** → `blog_posts` table + migration
2. **API routes** → CRUD completo no super-admin
3. **Super Admin UI** → Lista de posts + Editor com Tiptap
4. **Blog público** → Adaptar páginas para ler do banco
5. **SEO Quick Wins** → FAQ Schema, OG dinâmico, textos pt-BR
6. **Limpeza** → Remover sistema MDX antigo
7. **Testes** → Verificar sitemap, structured data, renderização

---

## Arquivos Afetados

### Novos
- `src/db/schema/blog-posts.ts`
- `src/app/api/super-admin/blog/route.ts`
- `src/app/api/super-admin/blog/[id]/route.ts`
- `src/app/api/super-admin/blog/upload/route.ts`
- `src/app/super-admin/blog/page.tsx`
- `src/app/super-admin/blog/create/page.tsx`
- `src/app/super-admin/blog/[id]/edit/page.tsx`
- `src/app/super-admin/blog/components/blog-editor.tsx`
- `src/app/super-admin/blog/components/blog-form.tsx`
- `src/app/api/og/route.tsx` (OG image generation)

### Modificados
- `src/db/schema/index.ts` (exportar nova tabela)
- `src/app/(website-layout)/blog/page.tsx` (ler do banco)
- `src/app/(website-layout)/blog/[slug]/page.tsx` (ler do banco)
- `src/app/sitemap.ts` (ler do banco)
- `src/app/super-admin/layout.tsx` (adicionar nav item)
- `src/app/(website-layout)/page.tsx` (FAQ Schema JSON-LD)

### Removidos
- `src/content/blog/` (pasta MDX)
- `src/shared/lib/mdx/blogs.ts`
