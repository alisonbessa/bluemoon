import { z } from "zod";

export const blogPostFormSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  slug: z.string().min(1, "Slug é obrigatório"),
  description: z.string().optional(),
  content: z.string().min(1, "Conteúdo é obrigatório"),
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
