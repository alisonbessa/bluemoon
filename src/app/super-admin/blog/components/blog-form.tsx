"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { BlogEditor } from "./blog-editor";
import { toast } from "sonner";
import { Loader2, X, Plus, Eye, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface BlogFormData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  featuredImage: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  authorName: string;
  publishedAt: string;
}

interface BlogFormProps {
  initialData?: BlogFormData;
  mode: "create" | "edit";
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function BlogForm({ initialData, mode }: BlogFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  const [formData, setFormData] = useState<BlogFormData>(
    initialData || {
      title: "",
      slug: "",
      description: "",
      content: "",
      featuredImage: "",
      tags: [],
      status: "draft",
      seoTitle: "",
      seoDescription: "",
      seoKeywords: [],
      authorName: "HiveBudget",
      publishedAt: "",
    }
  );

  const updateField = <K extends keyof BlogFormData>(
    field: K,
    value: BlogFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTitleChange = (title: string) => {
    updateField("title", title);
    if (mode === "create" || !initialData?.slug) {
      updateField("slug", generateSlug(title));
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !formData.tags.includes(tag)) {
      updateField("tags", [...formData.tags, tag]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    updateField(
      "tags",
      formData.tags.filter((t) => t !== tagToRemove)
    );
  };

  const addKeyword = () => {
    const keyword = newKeyword.trim();
    if (keyword && !formData.seoKeywords.includes(keyword)) {
      updateField("seoKeywords", [...formData.seoKeywords, keyword]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    updateField(
      "seoKeywords",
      formData.seoKeywords.filter((k) => k !== keywordToRemove)
    );
  };

  const handleFeaturedImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const response = await fetch("/api/super-admin/blog/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const { url } = await response.json();
      updateField("featuredImage", url);
      toast.success("Imagem enviada com sucesso");
    } catch {
      toast.error("Erro ao enviar imagem");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Conteúdo é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const url =
        mode === "create"
          ? "/api/super-admin/blog"
          : `/api/super-admin/blog/${initialData?.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success(
        mode === "create"
          ? "Post criado com sucesso!"
          : "Post atualizado com sucesso!"
      );
      router.push("/super-admin/blog");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar o post");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/super-admin/blog">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === "create" ? "Novo Post" : "Editar Post"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreview(!isPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreview ? "Editar" : "Preview"}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Slug */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Título do post"
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/blog/</span>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => updateField("slug", e.target.value)}
                    placeholder="url-do-post"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Breve descrição do post (aparece nos cards e meta description)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo</CardTitle>
            </CardHeader>
            <CardContent>
              {isPreview ? (
                <div
                  className="prose prose-sm sm:prose-base dark:prose-invert max-w-none min-h-[400px] p-4"
                  dangerouslySetInnerHTML={{ __html: formData.content }}
                />
              ) : (
                <BlogEditor
                  content={formData.content}
                  onChange={(html) => updateField("content", html)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 */}
        <div className="space-y-6">
          {/* Status & Publishing */}
          <Card>
            <CardHeader>
              <CardTitle>Publicação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "draft" | "published" | "archived") =>
                    updateField("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Arquivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="publishedAt">Data de publicação</Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={formData.publishedAt}
                  onChange={(e) => updateField("publishedAt", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Deixe vazio para usar a data atual ao publicar
                </p>
              </div>
              <div>
                <Label htmlFor="authorName">Autor</Label>
                <Input
                  id="authorName"
                  value={formData.authorName}
                  onChange={(e) => updateField("authorName", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader>
              <CardTitle>Imagem de Capa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.featuredImage && (
                <div className="relative">
                  <img
                    src={formData.featuredImage}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => updateField("featuredImage", "")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFeaturedImageUpload}
              />
              <p className="text-xs text-muted-foreground">
                Ou cole uma URL:
              </p>
              <Input
                value={formData.featuredImage}
                onChange={(e) => updateField("featuredImage", e.target.value)}
                placeholder="https://..."
              />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Nova tag"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle">
                  Título SEO{" "}
                  <span className="text-xs text-muted-foreground">
                    ({formData.seoTitle.length}/70)
                  </span>
                </Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => updateField("seoTitle", e.target.value)}
                  placeholder="Título para buscadores (opcional)"
                  maxLength={70}
                />
              </div>
              <div>
                <Label htmlFor="seoDescription">
                  Meta Description{" "}
                  <span className="text-xs text-muted-foreground">
                    ({formData.seoDescription.length}/160)
                  </span>
                </Label>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) =>
                    updateField("seoDescription", e.target.value)
                  }
                  placeholder="Descrição para buscadores (opcional)"
                  maxLength={160}
                  rows={3}
                />
              </div>
              <div>
                <Label>Keywords SEO</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.seoKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline" className="gap-1">
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="Nova keyword"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addKeyword}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* SEO Preview */}
              {(formData.seoTitle || formData.title) && (
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">
                    Preview no Google:
                  </p>
                  <p className="text-blue-600 text-sm font-medium truncate">
                    {formData.seoTitle || formData.title} | HiveBudget
                  </p>
                  <p className="text-green-700 text-xs">
                    hivebudget.com/blog/{formData.slug || "..."}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {formData.seoDescription ||
                      formData.description ||
                      "Sem descrição..."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
