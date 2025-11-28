import { appConfig } from "@/lib/config";

interface StructuredDataProps {
  type?: "WebSite" | "SoftwareApplication" | "Organization" | "Article";
  data?: Record<string, unknown>;
}

export function StructuredData({ type = "WebSite", data = {} }: StructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hivebudget.com";

  const getStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": type,
    };

    switch (type) {
      case "WebSite":
        return {
          ...baseData,
          name: appConfig.projectName,
          url: baseUrl,
          description: appConfig.description,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${baseUrl}/search?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
          publisher: {
            "@type": "Organization",
            name: appConfig.projectName,
            logo: `${baseUrl}/assets/logo.png`,
          },
          ...data,
        };

      case "SoftwareApplication":
        return {
          ...baseData,
          name: appConfig.projectName,
          description: appConfig.description,
          url: baseUrl,
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "BRL",
            availability: "https://schema.org/InStock",
          },
          author: {
            "@type": "Organization",
            name: appConfig.projectName,
            url: baseUrl,
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.8",
            ratingCount: "127",
            bestRating: "5",
            worstRating: "1",
          },
          featureList: [
            "Gestão de Transações",
            "Hives Colaborativos",
            "Categorização Inteligente",
            "Relatórios e Análises",
            "Controle de Orçamentos",
            "Interface Responsiva",
          ],
          ...data,
        };

      case "Organization":
        return {
          ...baseData,
          name: appConfig.projectName,
          url: baseUrl,
          logo: `${baseUrl}/assets/logo.png`,
          description: appConfig.description,
          contactPoint: {
            "@type": "ContactPoint",
            email: appConfig.legal.email,
            contactType: "customer service",
            areaServed: "BR",
            availableLanguage: "Portuguese",
          },
          address: {
            "@type": "PostalAddress",
            streetAddress: appConfig.legal.address.street,
            addressLocality: appConfig.legal.address.city,
            addressRegion: appConfig.legal.address.state,
            postalCode: appConfig.legal.address.postalCode,
            addressCountry: "BR",
          },
          sameAs: [appConfig.social.instagram].filter(Boolean),
          ...data,
        };

      case "Article":
        return {
          ...baseData,
          headline: data.title || appConfig.projectName,
          description: data.description || appConfig.description,
          image: data.image || `${baseUrl}/images/og-image.png`,
          author: {
            "@type": "Organization",
            name: appConfig.projectName,
            url: baseUrl,
          },
          publisher: {
            "@type": "Organization",
            name: appConfig.projectName,
            logo: {
              "@type": "ImageObject",
              url: `${baseUrl}/assets/logo.png`,
            },
          },
          datePublished: data.datePublished || new Date().toISOString(),
          dateModified: data.dateModified || new Date().toISOString(),
          ...data,
        };

      default:
        return { ...baseData, ...data };
    }
  };

  const structuredData = getStructuredData();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2),
      }}
    />
  );
}
