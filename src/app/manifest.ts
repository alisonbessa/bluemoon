import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HiveBudget",
    short_name: "HiveBudget",
    description:
      "Planeje seu orçamento antes de gastar. Controle financeiro colaborativo para casais e famílias brasileiras.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/assets/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
