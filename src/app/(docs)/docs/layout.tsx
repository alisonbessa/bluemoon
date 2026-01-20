import { source } from "@/shared/lib/docs/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/shared/lib/docs/layout.shared";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
