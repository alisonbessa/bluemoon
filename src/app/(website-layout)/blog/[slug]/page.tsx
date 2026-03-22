import { notFound } from "next/navigation";
import Image from "next/image";
import { Calendar, ChevronRight, Home, Tag } from "lucide-react";
import Link from "next/link";
import { ShareButton } from "@/shared/share-button";
import { Metadata } from "next";
import { cn } from "@/shared/lib/utils";
import { CTA2 } from "@/shared/website/cta-2";
import { WebPageJsonLd, ArticleJsonLd, BreadcrumbJsonLd } from "next-seo";
import { appConfig } from "@/shared/lib/config";
import DOMPurify from "isomorphic-dompurify";
import { db } from "@/db";
import { blogPosts } from "@/db/schema/blog-posts";
import { eq, and, desc, sql } from "drizzle-orm";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPostBySlug(slug: string) {
  const results = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);
  return results[0] || null;
}

async function getRelatedPosts(currentId: string, tags: string[]) {
  if (tags.length === 0) return [];

  const results = await db
    .select()
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, "published"),
        sql`id != ${currentId}`,
        sql`tags && ${tags}`
      )
    )
    .orderBy(desc(blogPosts.publishedAt))
    .limit(3);

  return results;
}

function extractHeadings(html: string) {
  const headingRegex = /<h([2-4])[^>]*>(.*?)<\/h[2-4]>/gi;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "");
    const id = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    headings.push({
      level: parseInt(match[1]),
      text,
      id,
    });
  }

  return headings;
}

function addIdsToHeadings(html: string) {
  return html.replace(/<h([2-4])([^>]*)>(.*?)<\/h[2-4]>/gi, (match, level, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, "");
    const id = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    return `<h${level} id="${id}"${attrs}>${content}</h${level}>`;
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return {};

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.description || "";
  const ogImage = post.featuredImage
    || `${process.env.NEXT_PUBLIC_APP_URL}/api/og?title=${encodeURIComponent(post.title)}`;

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
    title,
    description,
    keywords: post.seoKeywords || post.tags,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${post.slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL}/blog/${post.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const posts = await db
    .select({ slug: blogPosts.slug })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));

  return posts.map((post) => ({ slug: post.slug }));
}

async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.id, post.tags);
  const headings = extractHeadings(post.content);
  const sanitizedContent = DOMPurify.sanitize(post.content, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling", "target"],
    FORBID_TAGS: ["script", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  });
  const contentWithIds = addIdsToHeadings(sanitizedContent);

  const publishedDate = post.publishedAt?.toISOString() || post.createdAt.toISOString();

  return (
    <article className="max-w-6xl mx-auto py-6 md:py-10 px-4">
      <WebPageJsonLd
        useAppDir
        id={`${process.env.NEXT_PUBLIC_APP_URL}/blog/${post.slug}`}
        title={post.seoTitle || post.title}
        description={post.seoDescription || post.description || ""}
        lastUpdated={post.updatedAt.toISOString()}
        isAccessibleForFree={true}
        publisher={{
          "@type": "Organization",
          name: appConfig.projectName,
          url: process.env.NEXT_PUBLIC_APP_URL,
        }}
      />
      <ArticleJsonLd
        useAppDir
        type="BlogPosting"
        url={`${process.env.NEXT_PUBLIC_APP_URL}/blog/${post.slug}`}
        title={post.seoTitle || post.title}
        images={[
          post.featuredImage ||
            `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`,
        ]}
        datePublished={publishedDate}
        dateModified={post.updatedAt.toISOString()}
        authorName={post.authorName}
        description={post.seoDescription || post.description || ""}
        isAccessibleForFree={true}
        publisherName={appConfig.projectName}
        publisherLogo={`${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`}
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
          {
            position: 3,
            name: post.title,
            item: `${process.env.NEXT_PUBLIC_APP_URL}/blog/${post.slug}`,
          },
        ]}
      />

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center space-x-2 text-sm text-gray-600 mb-6"
      >
        <Link href="/" className="hover:text-primary flex items-center">
          <Home className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only">Home</span>
        </Link>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
        <Link href="/blog" className="hover:text-primary">
          Blog
        </Link>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
        <span
          className="font-medium truncate text-foreground/90"
          aria-current="page"
        >
          {post.title}
        </span>
      </nav>

      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
        <main className="max-w-4xl">
          {/* Featured Image */}
          {post.featuredImage && (
            <figure className="relative w-full h-48 sm:h-[400px] mb-6 md:mb-8 dark:opacity-80">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 800px"
                className="object-cover rounded-xl shadow-lg"
              />
            </figure>
          )}

          {/* Title */}
          <header>
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              {post.title}
            </h1>
          </header>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-gray-600 mb-6 md:mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              <time dateTime={publishedDate}>
                {new Date(publishedDate).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </time>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4" aria-hidden="true" />
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-foreground/10 px-2 py-1 rounded-full text-xs text-foreground/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Share button */}
          <ShareButton title={post.title} description={post.description || undefined} />

          {/* Mobile Table of Contents */}
          {headings.length > 0 && (
            <nav className="lg:hidden mb-8" aria-label="Índice">
              <div className="rounded-lg border bg-foreground/10 p-4">
                <h2 className="font-semibold mb-3 text-sm">Índice</h2>
                <ul className="space-y-2">
                  {headings.map((heading) => (
                    <li
                      key={heading.id}
                      style={{ paddingLeft: `${(heading.level - 2) * 16}px` }}
                    >
                      <a
                        href={`#${heading.id}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          )}

          {/* Content */}
          <div
            className={cn(
              "prose max-w-none",
              "prose-headings:scroll-mt-20 prose-headings:font-bold",
              "prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg",
              "prose-img:rounded-lg",
              "prose-a:text-primary prose-a:hover:text-primary/90",
              "prose-code:text-primary prose-code:before:content-none prose-code:after:content-none",
              "prose-sm sm:prose-base md:prose-lg",
              "dark:prose-invert"
            )}
            dangerouslySetInnerHTML={{ __html: contentWithIds }}
          />

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <section
              className="mt-12 md:mt-16"
              aria-labelledby="related-articles"
            >
              <h2 id="related-articles" className="text-2xl font-bold mb-6">
                Artigos Relacionados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {relatedPosts.map((related) => (
                  <article key={related.id} className="group">
                    <Link href={`/blog/${related.slug}`}>
                      <div className="border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                        {related.featuredImage && (
                          <figure className="relative w-full h-36">
                            <Image
                              src={related.featuredImage}
                              alt={related.title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                              className="object-cover shadow-xs"
                            />
                          </figure>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                            {related.title}
                          </h3>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Sidebar */}
        {headings.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-6">
              <nav aria-label="Índice">
                <h2 className="font-semibold mb-3 text-sm">Índice</h2>
                <ul className="space-y-2">
                  {headings.map((heading) => (
                    <li
                      key={heading.id}
                      style={{ paddingLeft: `${(heading.level - 2) * 16}px` }}
                    >
                      <a
                        href={`#${heading.id}`}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        )}
      </div>

      <footer className="mt-16">
        <CTA2 />
      </footer>
    </article>
  );
}

export default BlogDetailPage;
