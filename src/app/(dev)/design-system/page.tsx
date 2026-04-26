import Link from "next/link";
import {
  Palette,
  Box,
  FileText,
  Bell,
  Layers,
  Table2,
  Puzzle,
} from "lucide-react";
import { PageHeading } from "./_components/showcase";

const cards = [
  {
    href: "/design-system/tokens",
    title: "Tokens",
    description: "Cores, tipografia, espaçamento, raios e sombras.",
    icon: Palette,
  },
  {
    href: "/design-system/primitives",
    title: "Primitives",
    description: "Botões, inputs, badges, switches e demais átomos.",
    icon: Box,
  },
  {
    href: "/design-system/forms",
    title: "Forms",
    description: "Padrões com react-hook-form e validação Zod.",
    icon: FileText,
  },
  {
    href: "/design-system/feedback",
    title: "Feedback",
    description: "Alerts, toasts, progress, skeleton e estados.",
    icon: Bell,
  },
  {
    href: "/design-system/overlays",
    title: "Overlays",
    description: "Dialogs, drawers, sheets, popovers e tooltips.",
    icon: Layers,
  },
  {
    href: "/design-system/data",
    title: "Data display",
    description: "Tabelas, paginação, accordions, tabs.",
    icon: Table2,
  },
  {
    href: "/design-system/molecules",
    title: "Molecules",
    description: "Page header, empty state, summary card, selectors.",
    icon: Puzzle,
  },
];

export default function DesignSystemHome() {
  return (
    <div>
      <PageHeading
        title="Design System"
        description="Catálogo interno dos componentes e tokens da aplicação."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-start gap-3 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium leading-tight">{title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
