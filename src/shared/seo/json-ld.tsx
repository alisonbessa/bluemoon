/**
 * Native JSON-LD components to replace next-seo (incompatible with Next.js 16 Turbopack).
 * These render a <script type="application/ld+json"> tag directly.
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

function JsonLdScript({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface WebPageJsonLdProps {
  useAppDir?: boolean;
  id?: string;
  title: string;
  description?: string;
  isAccessibleForFree?: boolean;
  publisher?: Record<string, unknown>;
  [key: string]: unknown;
}

export function WebPageJsonLd({ title, description, id, isAccessibleForFree, publisher, useAppDir: _, ...rest }: WebPageJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: title,
        ...(description ? { description } : {}),
        ...(id ? { url: id } : {}),
        ...(isAccessibleForFree !== undefined ? { isAccessibleForFree } : {}),
        ...(publisher ? { publisher } : {}),
        ...rest,
      }}
    />
  );
}

interface ArticleJsonLdProps {
  useAppDir?: boolean;
  type?: string;
  url: string;
  title: string;
  description: string;
  images: string[];
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName: string;
  publisherLogo: string;
  isAccessibleForFree?: boolean;
}

export function ArticleJsonLd({
  url,
  title,
  description,
  images,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  publisherLogo,
}: ArticleJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        headline: title,
        description,
        image: images,
        datePublished,
        ...(dateModified ? { dateModified } : {}),
        author: { "@type": "Person", name: authorName },
        publisher: {
          "@type": "Organization",
          name: publisherName,
          logo: { "@type": "ImageObject", url: publisherLogo },
        },
      }}
    />
  );
}

interface BreadcrumbItem {
  position: number;
  name: string;
  item?: string;
}

interface BreadcrumbJsonLdProps {
  useAppDir?: boolean;
  itemListElements: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ itemListElements }: BreadcrumbJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: itemListElements.map((item) => ({
          "@type": "ListItem",
          position: item.position,
          name: item.name,
          item: item.item,
        })),
      }}
    />
  );
}
