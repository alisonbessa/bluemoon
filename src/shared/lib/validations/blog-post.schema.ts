import { z } from "zod";

export const blogPostFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título deve ter no máximo 200 caracteres"),
  slug: z.string().min(1, "Slug é obrigatório").max(200, "Slug deve ter no máximo 200 caracteres")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z.string().max(500, "Descrição deve ter no máximo 500 caracteres").optional(),
  content: z.string().min(1, "Conteúdo é obrigatório").max(200000, "Conteúdo excede o tamanho máximo"),
  featuredImage: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seoTitle: z.string().max(70, "Título SEO deve ter no máximo 70 caracteres").optional(),
  seoDescription: z.string().max(160, "Descrição SEO deve ter no máximo 160 caracteres").optional(),
  seoKeywords: z.array(z.string()).optional(),
  authorName: z.string().default("HiveBudget"),
  publishedAt: z.string().optional(),
});

export type BlogPostFormValues = z.infer<typeof blogPostFormSchema>;
