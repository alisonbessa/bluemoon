import Image from "next/image";
import Link from "next/link";
import { Tag } from "lucide-react";
import { Metadata } from "next";
import { CTA2 } from "@/shared/website/cta-2";
import { appConfig } from "@/shared/lib/config";
import { WebPageJsonLd, BreadcrumbJsonLd } from "next-seo";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { blogPosts } from "@/db/schema/blog-posts";
import { eq, desc } from "drizzle-orm";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Blog | ${appConfig.projectName}`,
  description: `Dicas e artigos sobre planejamento financeiro, orçamento familiar e controle de gastos com o ${appConfig.projectName}.`,
  openGraph: {
    title: `Blog | ${appConfig.projectName}`,
    description: `Dicas e artigos sobre planejamento financeiro, orçamento familiar e controle de gastos.`,
    type: "website",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/blog`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?title=Blog&description=Artigos+sobre+finan%C3%A7as+pessoais`,
        width: 1200,
        height: 630,
        alt: "Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Blog | ${appConfig.projectName}`,
    description: `Dicas e artigos sobre planejamento financeiro e controle de gastos.`,
    images: [
      `${process.env.NEXT_PUBLIC_APP_URL}/api/og?title=Blog&description=Artigos+sobre+finan%C3%A7as+pessoais`,
    ],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/blog`,
  },
};

async function getPublishedPosts() {
  try {
    return await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt));
  } catch {
    // Table may not exist yet during first build
    return [];
  }
}

export default async function BlogListPage() {
  const posts = await getPublishedPosts();

  if (posts.length === 0) {
    return notFound();
  }

  return (
    <article className="max-w-6xl mx-auto py-10 px-4">
      <WebPageJsonLd
        useAppDir
        id={`${process.env.NEXT_PUBLIC_APP_URL}/blog`}
        title={`Blog | ${appConfig.projectName}`}
        description={`Dicas e artigos sobre planejamento financeiro e controle de gastos com o ${appConfig.projectName}.`}
        isAccessibleForFree={true}
        publisher={{
          "@type": "Organization",
          name: appConfig.projectName,
          url: process.env.NEXT_PUBLIC_APP_URL,
        }}
      />
      <BreadcrumbJsonLd
        useAppDir
        itemListElements={[
          {
            position: 1,
            name: "Home",
            item: process.env.NEXT_PUBLIC_APP_URL,
          },
          {
            position: 2,
            name: "Blog",
            item: `${process.env.NEXT_PUBLIC_APP_URL}/blog`,
          },
        ]}
      />

      {/* Hero Section */}
      <header className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Dicas práticas sobre planejamento financeiro, orçamento familiar e
          como organizar suas finanças com o {appConfig.projectName}.
        </p>
      </header>

      {/* Blog Posts Grid */}
      <main>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <article key={post.id} className="flex flex-col">
              <Link href={`/blog/${post.slug}`} className="group">
                <div className="border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                  {/* Featured Image */}
                  {post.featuredImage && (
                    <figure className="relative w-full h-48">
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover shadow-xs"
                      />
                    </figure>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <header>
                      <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                    </header>
                    {post.description && (
                      <p className="text-foreground/60 mb-4 line-clamp-2">
                        {post.description}
                      </p>
                    )}

                    {/* Tags */}
                    <footer className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center text-xs text-foreground/60 bg-foreground/10 px-3 py-1 rounded-full"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </footer>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </main>

      <footer className="mt-16">
        <CTA2 />
      </footer>
    </article>
  );
}
