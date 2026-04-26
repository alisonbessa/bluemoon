import { PageHeading, Showcase } from "../_components/showcase";

const semanticColors = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "success",
  "success-foreground",
  "warning",
  "warning-foreground",
  "border",
  "input",
  "ring",
];

const chartColors = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

const radii = [
  { name: "sm", value: "calc(var(--radius) - 4px)" },
  { name: "md", value: "calc(var(--radius) - 2px)" },
  { name: "lg (default)", value: "var(--radius)" },
  { name: "xl", value: "calc(var(--radius) + 4px)" },
  { name: "full", value: "9999px" },
];

const shadows = ["2xs", "xs", "sm", "", "md", "lg", "xl", "2xl"] as const;

const typography = [
  { label: "PageTitle (h1)", className: "text-2xl sm:text-3xl font-bold tracking-tight" },
  { label: "SectionTitle (h2)", className: "text-lg sm:text-xl font-semibold tracking-tight" },
  { label: "CardTitleText (h3)", className: "text-base sm:text-lg font-semibold" },
  { label: "Text", className: "text-sm sm:text-base" },
  { label: "MutedText", className: "text-sm sm:text-base text-muted-foreground" },
  { label: "SmallText", className: "text-xs sm:text-sm" },
  { label: "LargeValue", className: "text-2xl sm:text-3xl font-bold tabular-nums" },
  { label: "MediumValue", className: "text-xl sm:text-2xl font-semibold tabular-nums" },
];

const fonts = [
  { name: "Sans", className: "font-sans", sample: "Plus Jakarta Sans" },
  { name: "Serif", className: "font-serif", sample: "Source Serif 4" },
  { name: "Mono", className: "font-mono", sample: "JetBrains Mono" },
];

function Swatch({ name }: { name: string }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div
        className="h-16 w-full"
        style={{ background: `var(--${name})` }}
      />
      <div className="px-2 py-1.5">
        <p className="font-mono text-xs">--{name}</p>
      </div>
    </div>
  );
}

export default function TokensPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="Tokens"
        description="Variáveis de design definidas em globals.css. Light e dark modes seguem os mesmos nomes."
      />

      <Showcase
        title="Cores semânticas"
        description="Definidas em :root e .dark. Use via classes Tailwind (bg-primary, text-foreground...)."
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {semanticColors.map((c) => (
            <Swatch key={c} name={c} />
          ))}
        </div>
      </Showcase>

      <Showcase title="Cores de gráfico">
        <div className="grid grid-cols-5 gap-2">
          {chartColors.map((c) => (
            <Swatch key={c} name={c} />
          ))}
        </div>
      </Showcase>

      <Showcase title="Tipografia" description="Helpers em src/shared/ui/typography.tsx">
        <div className="space-y-3">
          {typography.map((t) => (
            <div key={t.label} className="flex items-baseline gap-3 border-b pb-2 last:border-0">
              <span className="w-44 shrink-0 font-mono text-xs text-muted-foreground">
                {t.label}
              </span>
              <span className={t.className}>The quick brown fox</span>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase title="Famílias de fonte">
        <div className="space-y-3">
          {fonts.map((f) => (
            <div key={f.name} className="flex items-baseline gap-3 border-b pb-2 last:border-0">
              <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                {f.name}
              </span>
              <span className={`${f.className} text-base`}>{f.sample} — 0123456789</span>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase title="Border radius">
        <div className="flex flex-wrap items-end gap-4">
          {radii.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="h-16 w-16 border bg-muted"
                style={{ borderRadius: r.value }}
              />
              <p className="font-mono text-xs">{r.name}</p>
            </div>
          ))}
        </div>
      </Showcase>

      <Showcase title="Sombras">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {shadows.map((s) => {
            const cls = s ? `shadow-${s}` : "shadow";
            const label = s || "shadow";
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className={`h-16 w-full rounded-md bg-card ${cls}`} />
                <p className="font-mono text-xs">{label}</p>
              </div>
            );
          })}
        </div>
      </Showcase>

      <Showcase title="Spacing scale" description="Base: 0.25rem (4px). Tailwind step = N × base.">
        <div className="space-y-2">
          {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <span className="w-12 font-mono text-xs text-muted-foreground">
                p-{n}
              </span>
              <div className="h-3 rounded-sm bg-primary" style={{ width: `${n * 0.25}rem` }} />
              <span className="text-xs text-muted-foreground">{n * 4}px</span>
            </div>
          ))}
        </div>
      </Showcase>
    </div>
  );
}
