"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { BlogForm } from "../../components/blog-form";
import { Loader2 } from "lucide-react";

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();

  const { data: post, isLoading, error } = useSWR(
    `/api/super-admin/blog/${id}`
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">Erro ao carregar post</p>
      </div>
    );
  }

  return (
    <BlogForm
      mode="edit"
      initialData={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        description: post.description || "",
        content: post.content,
        featuredImage: post.featuredImage || "",
        tags: post.tags || [],
        status: post.status,
        seoTitle: post.seoTitle || "",
        seoDescription: post.seoDescription || "",
        seoKeywords: post.seoKeywords || [],
        authorName: post.authorName || "HiveBudget",
        publishedAt: post.publishedAt
          ? new Date(post.publishedAt).toISOString().slice(0, 16)
          : "",
      }}
    />
  );
}
