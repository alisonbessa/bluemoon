import { appConfig } from "@/shared/lib/config";

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
          offers: [
            {
              "@type": "Offer",
              name: "Solo",
              price: "14.90",
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
              description: "Para organizar suas finanças pessoais",
            },
            {
              "@type": "Offer",
              name: "Duo",
              price: "19.90",
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
              description: "Para casais organizarem as finanças juntos",
            },
          ],
          author: {
            "@type": "Organization",
            name: appConfig.projectName,
            url: baseUrl,
          },
          featureList: [
            "Orçamento inteligente",
            "Controle de parcelamentos",
            "Cartões de crédito brasileiros",
            "Registro de gastos por mensagem no WhatsApp",
            "Metas financeiras",
            "Relatórios e dashboards",
            "Orçamento compartilhado para casais",
            "Privacidade em contas individuais",
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
          sameAs: [
            appConfig.social.instagram,
            appConfig.social.twitter,
            appConfig.social.linkedin,
            appConfig.social.facebook,
            appConfig.social.youtube,
          ].filter(Boolean),
          ...data,
        };

      case "Article":
        return {
          ...baseData,
          headline: data.title || appConfig.projectName,
          description: data.description || appConfig.description,
          image: data.image || `${baseUrl}/images/og.png`,
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
