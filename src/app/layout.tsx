import type { Metadata } from "next";
import "./globals.css";
import { appConfig } from "@/shared/lib/config";
import Providers from "./Providers";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Using system fonts as fallback when Google Fonts is unavailable
// This ensures build succeeds in all environments

export const metadata: Metadata = {
  title: {
    template: `%s | ${appConfig.projectName}`,
    absolute: appConfig.projectName,
  },
  description: appConfig.description,
  keywords: appConfig.keywords,
  openGraph: {
    title: appConfig.projectName,
    description: appConfig.description,
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: appConfig.projectName,
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/logo.png" sizes="any" />
        <link rel="apple-touch-icon" href="/assets/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="font-sans antialiased bg-background" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
